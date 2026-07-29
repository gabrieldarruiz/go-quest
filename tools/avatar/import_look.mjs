// Importa um gopher VESTIDO (imagem completa), alinha pelos olhos com a base do
// jogo e extrai as roupas por diferença → tools/avatar/items/<hatId>.png + <outfitId>.png
// Uso: node import_look.mjs <imagem.png> <hatId> <outfitId>
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { decodePNG } from "/Users/darraos/ws/go-quest/tools/avatar/import_png.mjs";
import { GRID_W, GRID_H, BASE, SKINS, DEFAULT_SKIN, COMMON } from "/Users/darraos/ws/go-quest/src/avatar/sprites.js";

const [, , FILE, HAT_ID, OUTFIT_ID] = process.argv;
const img = decodePNG(readFileSync(FILE));
console.log(`imagem ${img.w}x${img.h} → alvo ${GRID_W}x${GRID_H}`);

// olhos da base (referência de alinhamento): centros L(13,24) R(24.5,24) — PAD_T 12
const BASE_EYE_DIST = 11.5, BASE_EYE_MID_X = 18.75, BASE_EYE_CY = 24;

const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const corners = [[2, 2], [img.w - 3, 2], [2, img.h - 3], [img.w - 3, img.h - 3]].map(([x, y]) => img.px(x, y));
const bgRef = [0, 1, 2].map(i => Math.round(corners.reduce((s, c) => s + c[i], 0) / 4));

// bbox do sprite (limiar baixo: cabelo escuro quase da cor do fundo conta)
let x0 = img.w, x1 = 0, y0 = img.h, y1 = 0;
for (let y = 0; y < img.h; y += 2) for (let x = 0; x < img.w; x += 2) {
  if (dist(img.px(x, y), bgRef) > 32) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
}
const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
console.log(`bbox ${bw}x${bh}, fundo ${bgRef}`);

// reamostra por votação de região numa grade candidata
function sampleGrid(N) {
  const cell = bw / N, NH = Math.round(bh / cell);
  const cells = [], unif = [];
  for (let cy = 0; cy < NH; cy++) {
    const row = [], urow = [];
    for (let cx = 0; cx < N; cx++) {
      const votes = new Map();
      let total = 0;
      const xa = Math.round(x0 + cx * cell), xb = Math.min(img.w - 1, Math.round(x0 + (cx + 1) * cell));
      const ya = Math.round(y0 + cy * cell), yb = Math.min(img.h - 1, Math.round(y0 + (cy + 1) * cell));
      for (let y = ya; y < yb; y += 2) for (let x = xa; x < xb; x += 2) {
        const [r, g, b] = img.px(x, y);
        const key = `${r >> 4},${g >> 4},${b >> 4}`;
        votes.set(key, (votes.get(key) || 0) + 1);
        total++;
      }
      const [winKey, winN] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
      row.push(winKey.split(",").map(v => (parseInt(v, 10) << 4) + 8));
      urow.push(total ? winN / total : 1);
    }
    cells.push(row);
    unif.push(urow);
  }
  return { cells, unif, NH };
}

// mede olhos: células brancas na metade de cima, agrupadas por lado
function measureEyes(cells, N, NH) {
  const isWhite = c => c[0] > 190 && c[1] > 190 && c[2] > 190;
  let L = { sx: 0, sy: 0, n: 0 }, R = { sx: 0, sy: 0, n: 0 };
  const whites = [];
  for (let y = 0; y < NH * 0.6; y++) for (let x = 0; x < N; x++) if (isWhite(cells[y][x])) whites.push([x, y]);
  if (whites.length < 8) return null;
  const midX = whites.reduce((s, [x]) => s + x, 0) / whites.length;
  for (const [x, y] of whites) { const t = x < midX ? L : R; t.sx += x; t.sy += y; t.n++; }
  if (!L.n || !R.n) return null;
  return { lx: L.sx / L.n, ly: L.sy / L.n, rx: R.sx / R.n, ry: R.sy / R.n };
}

// escolhe a grade cuja distância entre olhos bate com a base
let best = null;
for (let N = 26; N <= 46; N++) {
  const { cells, unif, NH } = sampleGrid(N);
  const eyes = measureEyes(cells, N, NH);
  if (!eyes) continue;
  const d = Math.abs((eyes.rx - eyes.lx) - BASE_EYE_DIST);
  if (!best || d < best.d) best = { N, NH, cells, unif, eyes, d };
}
const { N, NH, cells, unif, eyes } = best;
console.log(`grade ${N}x${NH} (olhos dist ${(eyes.rx - eyes.lx).toFixed(1)} vs base ${BASE_EYE_DIST})`);

// remove fundo por flood-fill (células parecidas com o fundo)
const outside = Array.from({ length: NH }, () => Array(N).fill(false));
{
  const stack = [];
  for (let x = 0; x < N; x++) stack.push([0, x], [NH - 1, x]);
  for (let y = 0; y < NH; y++) stack.push([y, 0], [y, N - 1]);
  while (stack.length) {
    const [y, x] = stack.pop();
    if (y < 0 || y >= NH || x < 0 || x >= N || outside[y][x]) continue;
    // fundo = cor parecida com bg E célula uniforme (cabelo escuro tem textura)
    if (dist(cells[y][x], bgRef) > 65 || unif[y][x] < 0.88) continue;
    outside[y][x] = true;
    stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
  }
}

// tons de pele (azul do corpo): varre a região do rosto inteira e agrupa os azulados
const eyeCY = (eyes.ly + eyes.ry) / 2;
const skinTones = [];
for (let y = Math.round(eyeCY - 8); y <= Math.round(eyeCY + 10); y++) {
  for (let x = Math.round(eyes.lx - 8); x <= Math.round(eyes.rx + 8); x++) {
    if (y < 0 || y >= NH || x < 0 || x >= N || outside[y]?.[x]) continue;
    const c = cells[y][x];
    const avg = (c[0] + c[1] + c[2]) / 3;
    if (c[2] > c[0] && avg > 75 && avg < 200 && !(c[0] > 190 && c[1] > 190)) { // azulado médio-claro (exclui cabelo escuro)
      if (!skinTones.some(t => dist(t, c) < 30) && skinTones.length < 6) skinTones.push(c);
    }
  }
}
console.log("tons de pele detectados:", skinTones.map(c => `#${c.map(v => v.toString(16).padStart(2, "0")).join("")}`).join(" "));

// alinhamento: desloca a grade para casar os olhos com a base
const dx = Math.round(BASE_EYE_MID_X - (eyes.lx + eyes.rx) / 2);
const dy = Math.round(BASE_EYE_CY - eyeCY);
console.log(`offset alinhamento: dx ${dx}, dy ${dy}`);

// paleta da base (skin padrão) para o teste de igualdade
const skin = SKINS[DEFAULT_SKIN];
const BASE_PAL = { ...COMMON, b: skin.b, d: skin.d, l: skin.l, e: skin.e };
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// máscara de item: célula vestida difere da base e não é tom de pele
const itemMask = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null));
for (let y = 0; y < NH; y++) for (let x = 0; x < N; x++) {
  if (outside[y][x]) continue;
  const gx = x + dx, gy = y + dy;
  if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) continue;
  const c = cells[y][x];
  if (skinTones.some(t => dist(t, c) < 36)) continue;         // pele azul → transparente
  // disco dos olhos da base: só deixa passar cabelo escuro na parte de cima
  const inEye = ((gx + 0.5 - 13) ** 2 + (gy + 0.5 - BASE_EYE_CY) ** 2 <= 7.5 ** 2) ||
                ((gx + 0.5 - 24.5) ** 2 + (gy + 0.5 - BASE_EYE_CY) ** 2 <= 7.5 ** 2);
  const isDark = (c[0] + c[1] + c[2]) / 3 < 70;
  if (inEye && !(isDark && gy < BASE_EYE_CY - 3)) continue;
  const baseCh = BASE[gy][gx];
  if (baseCh !== ".") {
    const bc = hex2rgb(BASE_PAL[baseCh]);
    if (dist(bc, c) < 40) continue;                           // igual à base (dente/focinho) → transparente
  }
  itemMask[gy][gx] = c;
}

// sombra do chão: células cor-de-fundo nas últimas linhas são resíduo
for (let y = GRID_H - 9; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
  if (itemMask[y][x] && dist(itemMask[y][x], bgRef) < 42) itemMask[y][x] = null;
}

// erosão de halo: célula cor-de-fundo com 3+ vizinhos vazios é resíduo de borda
for (let pass = 0; pass < 2; pass++) {
  const kill = [];
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    if (!itemMask[y][x]) continue;
    if (dist(itemMask[y][x], bgRef) > 34) continue;
    let empty = 0;
    for (const [ny, nx] of [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]]) {
      if (ny < 0 || ny >= GRID_H || nx < 0 || nx >= GRID_W || !itemMask[ny][nx]) empty++;
    }
    if (empty >= 3) kill.push([y, x]);
  }
  for (const [y, x] of kill) itemMask[y][x] = null;
}

// componentes conexos → hat (centro acima do corte) ou outfit
const SPLIT_ROW = Math.round(BASE_EYE_CY + 9);
const seen = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(false));
const hatGrid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null));
const outfitGrid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null));
let nHat = 0, nOut = 0, nDrop = 0;
for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
  if (!itemMask[y][x] || seen[y][x]) continue;
  const comp = [];
  const stack = [[y, x]];
  seen[y][x] = true;
  while (stack.length) {
    const [cy, cx] = stack.pop();
    comp.push([cy, cx]);
    for (const [ny, nx] of [[cy - 1, cx], [cy + 1, cx], [cy, cx - 1], [cy, cx + 1], [cy - 1, cx - 1], [cy - 1, cx + 1], [cy + 1, cx - 1], [cy + 1, cx + 1]]) {
      if (ny < 0 || ny >= GRID_H || nx < 0 || nx >= GRID_W || seen[ny][nx] || !itemMask[ny][nx]) continue;
      seen[ny][nx] = true;
      stack.push([ny, nx]);
    }
  }
  if (comp.length < 3) { nDrop += comp.length; continue; }    // ruído
  const xs = comp.map(([, px]) => px);
  if (Math.max(...xs) < 4 || Math.min(...xs) > GRID_W - 5) { nDrop += comp.length; continue; } // artefato de margem
  const cyAvg = comp.reduce((s, [py]) => s + py, 0) / comp.length;
  const target = cyAvg < SPLIT_ROW ? hatGrid : outfitGrid;
  if (cyAvg < SPLIT_ROW) nHat += comp.length; else nOut += comp.length;
  for (const [py, px] of comp) target[py][px] = itemMask[py][px];
}
console.log(`células: hat ${nHat} · outfit ${nOut} · ruído descartado ${nDrop}`);

// fecha vãos horizontais estreitos no outfit (vão entre pernas etc.) com sombra
for (let y = SPLIT_ROW; y < GRID_H; y++) {
  let x = 0;
  while (x < GRID_W) {
    if (outfitGrid[y][x]) { x++; continue; }
    const start = x;
    while (x < GRID_W && !outfitGrid[y][x]) x++;
    const left = start > 0 ? outfitGrid[y][start - 1] : null;
    const right = x < GRID_W ? outfitGrid[y][x] : null;
    if (left && right && x - start <= 7) {
      const shade = left.map((v, i) => Math.round((v + right[i]) / 2 * 0.55));
      for (let fx = start; fx < x; fx++) outfitGrid[y][fx] = shade;
    }
  }
}

// grava PNG 1x com alpha
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };
function writeItem(path, grid) {
  const raw = Buffer.alloc(GRID_H * (1 + GRID_W * 4));
  for (let y = 0; y < GRID_H; y++) {
    const rs = y * (1 + GRID_W * 4);
    for (let x = 0; x < GRID_W; x++) {
      const o = rs + 1 + x * 4;
      const c = grid[y][x];
      if (!c) { raw[o + 3] = 0; continue; }
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(GRID_W, 0); ihdr.writeUInt32BE(GRID_H, 4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
  console.log("gravado:", path);
}
const DEST = "/Users/darraos/ws/go-quest/tools/avatar/items";
writeItem(`${DEST}/${HAT_ID}.png`, hatGrid);
writeItem(`${DEST}/${OUTFIT_ID}.png`, outfitGrid);
