// Importa src/assets/gopher.png: acha o bbox do sprite, detecta o tamanho da célula,
// extrai as cores por votação, remove fundo por flood-fill e agrupa a paleta.
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { decodePNG } from "/Users/darraos/ws/go-quest/tools/avatar/import_png.mjs";

const img = decodePNG(readFileSync("/Users/darraos/ws/go-quest/src/assets/gopher.png"));
console.log(`imagem ${img.w}x${img.h}`);

// fundo de referência = média dos 4 cantos
const corners = [[2, 2], [img.w - 3, 2], [2, img.h - 3], [img.w - 3, img.h - 3]].map(([x, y]) => img.px(x, y));
const bgRef = [0, 1, 2].map(i => Math.round(corners.reduce((s, c) => s + c[i], 0) / 4));
const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
console.log("cor de fundo ref:", bgRef);

// bounding box do que não é fundo
let x0 = img.w, x1 = 0, y0 = img.h, y1 = 0;
for (let y = 0; y < img.h; y += 2) for (let x = 0; x < img.w; x += 2) {
  if (dist(img.px(x, y), bgRef) > 70) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
}
console.log(`bbox: x ${x0}-${x1} (${x1 - x0 + 1}), y ${y0}-${y1} (${y1 - y0 + 1})`);

// detecta nº de células na largura: menor variância intra-célula
const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
function scoreGrid(N) {
  const cell = bw / N;
  const NH = Math.round(bh / cell);
  let disagree = 0, total = 0;
  for (let cy = 0; cy < NH; cy += 1) for (let cx = 0; cx < N; cx += 1) {
    const pts = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].map(([ox, oy]) =>
      img.px(Math.min(img.w - 1, Math.round(x0 + (cx + ox) * cell)), Math.min(img.h - 1, Math.round(y0 + (cy + oy) * cell))));
    const center = pts[0];
    if (dist(center, bgRef) < 60) continue; // só pontua dentro do sprite
    for (let i = 1; i < pts.length; i++) { total++; if (dist(pts[i], center) > 48) disagree++; }
  }
  return total ? disagree / total : 1;
}
// estimativa do tamanho da célula por run-length: corridas de cor são múltiplas da célula
const runHist = new Map();
for (let y = y0; y <= y1; y += 3) {
  let runStart = x0, prev = null;
  for (let x = x0; x <= x1; x++) {
    const [r, g, b] = img.px(x, y);
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    if (key !== prev) {
      const len = x - runStart;
      if (len >= 8 && len <= 30) runHist.set(len, (runHist.get(len) || 0) + 1);
      runStart = x; prev = key;
    }
  }
}
// grade alvo fixa (arte tem "pixels" irregulares — reamostra por votação de região)
let bestN = parseInt(process.argv[2] || "34", 10);
let bestScore = 0;
console.log(`grade alvo: ${bestN} colunas`);
const cell = bw / bestN;
const LW = bestN, LH = Math.round(bh / cell);
console.log(`melhor grade: ${LW}x${LH} células de ${cell.toFixed(2)}px (score ${bestScore.toFixed(3)})`);

// extrai células por votação de REGIÃO COMPLETA (robusto a grade irregular)
function sampleCell(cx, cy) {
  const votes = new Map();
  const xa = Math.round(x0 + cx * cell), xb = Math.min(img.w - 1, Math.round(x0 + (cx + 1) * cell));
  const ya = Math.round(y0 + cy * cell), yb = Math.min(img.h - 1, Math.round(y0 + (cy + 1) * cell));
  for (let y = ya; y < yb; y += 2) for (let x = xa; x < xb; x += 2) {
    const [r, g, b] = img.px(x, y);
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    votes.set(key, (votes.get(key) || 0) + 1);
  }
  const win = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const [r, g, b] = win.split(",").map(v => (parseInt(v, 10) << 4) + 8);
  return [r, g, b];
}
const cells = [];
for (let y = 0; y < LH; y++) {
  const row = [];
  for (let x = 0; x < LW; x++) row.push(sampleCell(x, y));
  cells.push(row);
}

// encoder PNG compartilhado
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };
function writeDebugPNG(path, raw, PW, PH) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(PW, 0); ihdr.writeUInt32BE(PH, 4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}

// debug: renderiza as células cruas antes do flood-fill
{
  const S = 12, PW = LW * S, PH = LH * S;
  const raw2 = Buffer.alloc(PH * (1 + PW * 4));
  for (let y = 0; y < PH; y++) {
    const rs = y * (1 + PW * 4);
    for (let x = 0; x < PW; x++) {
      const c = cells[Math.floor(y / S)][Math.floor(x / S)];
      const o = rs + 1 + x * 4;
      raw2[o] = c[0]; raw2[o + 1] = c[1]; raw2[o + 2] = c[2]; raw2[o + 3] = 255;
    }
  }
  writeDebugPNG("./gopher_cells.png", raw2, PW, PH);
}

// flood fill do contorno atravessando só células "cara de fundo":
// dessaturadas (max-min pequeno) e de brilho médio — o sprite é saturado, preto ou branco
const isBgLike = c => {
  const mx = Math.max(...c), mn = Math.min(...c), avg = (c[0] + c[1] + c[2]) / 3;
  return mx - mn < 42 && avg > 32 && avg < 160;
};
const outside = Array.from({ length: LH }, () => Array(LW).fill(false));
const stack = [];
for (let x = 0; x < LW; x++) { stack.push([0, x], [LH - 1, x]); }
for (let y = 0; y < LH; y++) { stack.push([y, 0], [y, LW - 1]); }
while (stack.length) {
  const [y, x] = stack.pop();
  if (y < 0 || y >= LH || x < 0 || x >= LW || outside[y][x] || !isBgLike(cells[y][x])) continue;
  outside[y][x] = true;
  stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
}

// agrupa cores restantes (merge por distância)
const clusters = []; // {color, count}
for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
  if (outside[y][x]) continue;
  const c = cells[y][x];
  const hit = clusters.find(cl => dist(cl.color, c) < 36);
  if (hit) { hit.count++; hit.sum = hit.sum.map((v, i) => v + c[i]); }
  else clusters.push({ color: c, count: 1, sum: [...c] });
}
clusters.forEach(cl => { cl.color = cl.sum.map(v => Math.round(v / cl.count)); });
clusters.sort((a, b) => b.count - a.count);
// limpeza: mata clusters de sujeira (sombra/halo) — dessaturados médios ou minúsculos
const isGrime = cl => {
  const [r, g, b] = cl.color, mx = Math.max(r, g, b), mn = Math.min(r, g, b), avg = (r + g + b) / 3;
  return cl.count < 6 || (mx - mn < 10 && avg > 20 && avg < 85);
};
const dead = new Set(clusters.filter(isGrime).map(cl => cl));
for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
  if (outside[y][x]) continue;
  const c = cells[y][x];
  let bi = null, bd = 1e9;
  clusters.forEach(cl => { const d = dist(cl.color, c); if (d < bd) { bd = d; bi = cl; } });
  if (dead.has(bi)) outside[y][x] = true;
}
const removed = clusters.filter(cl => dead.has(cl)).map(cl => `${cl.count}×`).length;
console.log(`clusters de sujeira removidos: ${removed}`);
for (let i = clusters.length - 1; i >= 0; i--) if (dead.has(clusters[i])) clusters.splice(i, 1);
const CHARS = "obdlmwptfnkKse123456789";
const hex = c => `#${c.map(v => v.toString(16).padStart(2, "0")).join("")}`;
console.log("\npaleta agrupada:");
clusters.forEach((cl, i) => console.log(`  ${CHARS[i]} → ${hex(cl.color)} (${cl.count})`));

const rows = [];
for (let y = 0; y < LH; y++) {
  let r = "";
  for (let x = 0; x < LW; x++) {
    if (outside[y][x]) { r += "."; continue; }
    const c = cells[y][x];
    let bi = 0, bd = 1e9;
    clusters.forEach((cl, i) => { const d = dist(cl.color, c); if (d < bd) { bd = d; bi = i; } });
    r += CHARS[bi];
  }
  rows.push(r);
}
const palette = Object.fromEntries(clusters.map((cl, i) => [CHARS[i], hex(cl.color)]));
writeFileSync("./gopher_imported.json", JSON.stringify({ width: LW, height: LH, palette, rows }, null, 2));
console.log(`\ngrade final ${LW}x${LH} gravada em gopher_imported.json`);

// renderiza PNG fiel (cores reais) para inspeção
{
  const S = 10, PW = LW * S, PH = LH * S;
  const raw = Buffer.alloc(PH * (1 + PW * 4));
  for (let y = 0; y < PH; y++) {
    const rs = y * (1 + PW * 4);
    for (let x = 0; x < PW; x++) {
      const ch = rows[Math.floor(y / S)][Math.floor(x / S)];
      const rgb = ch === "." ? [58, 42, 74] : clusters[CHARS.indexOf(ch)].color;
      const o = rs + 1 + x * 4;
      raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; raw[o + 3] = 255;
    }
  }
  writeDebugPNG("./gopher_imported.png", raw, PW, PH);
}
console.log("preview: gopher_imported.png");
