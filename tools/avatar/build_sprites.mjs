// Gera src/avatar/sprites.js a partir da ARTE DO USUÁRIO (gopher_base.json,
// importada de src/assets/gopher.png via import_reference.mjs).
// Os itens (gorro/óculos/casaco) são desenhados por cima, encaixados por medição.
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const HERE = new URL(".", import.meta.url).pathname;
const src = JSON.parse(readFileSync(`${HERE}/gopher_base.json`, "utf8"));

// ── remapeia cores do import para chaves semânticas ──────────────────────────
const ANCHORS = [
  ["b", [0x8c, 0xe8, 0xf8]], // corpo
  ["o", [0x09, 0x17, 0x17]], // contorno/pupila
  ["d", [0x56, 0xc6, 0xd6]], // sombra do corpo
  ["w", [0xf8, 0xf8, 0xf8]], // branco (olhos/dentes)
  ["l", [0x42, 0xa0, 0xb9]], // sombra profunda
  ["m", [0xf8, 0xe8, 0xb9]], // tan (focinho/mãos/pés)
  ["e", [0x18, 0x63, 0x78]], // anel dos olhos
  ["F", [0xd6, 0xa8, 0x78]], // tan escuro (dedinhos)
];
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const remap = {};
for (const [ch, hx] of Object.entries(src.palette)) {
  const c = hex2rgb(hx);
  let best = "o", bd = 1e18;
  for (const [k, a] of ANCHORS) { const d = dist(c, a); if (d < bd) { bd = d; best = k; } }
  remap[ch] = best;
}

// ── pad para a grade do jogo ─────────────────────────────────────────────────
const PAD_L = 2, PAD_T = 3, PAD_B = 2;
export const W = src.width + PAD_L + 2;   // 38
export const H = src.height + PAD_T + PAD_B; // 52
const grid = () => Array.from({ length: H }, () => Array(W).fill("."));

export function genBase() {
  const g = grid();
  src.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === ".") continue;
      g[y + PAD_T][x + PAD_L] = remap[row[x]];
    }
  });
  return g;
}

// ── medições sobre a base ────────────────────────────────────────────────────
const BASE_G = genBase();
function measure() {
  let headTop = H;
  const edges = [];
  for (let y = 0; y < H; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < W; x++) if (BASE_G[y][x] !== ".") { if (lo < 0) lo = x; hi = x; }
    edges.push([lo, hi]);
    if (lo >= 0 && y < headTop) headTop = y;
  }
  // olhos: só o BRANCO ('w') na metade de cima, separado pelo centro
  const cx = W / 2;
  let L = { x0: W, x1: 0, y0: H, y1: 0 }, R = { x0: W, x1: 0, y0: H, y1: 0 };
  for (let y = 0; y < H / 2; y++) for (let x = 0; x < W; x++) {
    if (BASE_G[y][x] !== "w") continue;
    const t = x < cx ? L : R;
    t.x0 = Math.min(t.x0, x); t.x1 = Math.max(t.x1, x);
    t.y0 = Math.min(t.y0, y); t.y1 = Math.max(t.y1, y);
  }
  const eye = t => ({
    cx: (t.x0 + t.x1) / 2 + 0.5,
    cy: (t.y0 + t.y1) / 2 + 0.5,
    r: Math.max(t.x1 - t.x0, t.y1 - t.y0) / 2 + 0.5,
  });
  return { headTop, edges, eyeL: eye(L), eyeR: eye(R) };
}
const M = measure();

// ── helpers de desenho ───────────────────────────────────────────────────────
function fillEllipse(g, cx, cy, rx, ry, ch) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) g[y][x] = ch;
  }
}
function outline(g, solid = null) {
  const ok = (y, x) => y >= 0 && y < H && x >= 0 && x < W && g[y][x] !== "." && (!solid || solid.includes(g[y][x]));
  const marks = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] === "." || (solid && !solid.includes(g[y][x]))) continue;
    if (!ok(y - 1, x) || !ok(y + 1, x) || !ok(y, x - 1) || !ok(y, x + 1)) marks.push([y, x]);
  }
  for (const [y, x] of marks) g[y][x] = "o";
}
const put = (g, y, x, ch) => { if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = ch; };
const rect = (g, y0, y1, x0, x1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, y, x, ch); };

// ── GORRO: domo sobre o topo da cabeça, faixa até a altura dos olhos ─────────
export function genBeanie() {
  const g = grid();
  const bandTop = Math.round(M.eyeL.cy - M.eyeL.r) - 1; // encosta no topo dos olhos
  const domeTop = Math.max(0, M.headTop - 3);
  const headHW = (M.edges[bandTop + 2][1] - M.edges[bandTop + 2][0]) / 2 + 1;
  const cx = W / 2;
  for (let y = domeTop; y < bandTop; y++) {
    const t = (y - domeTop) / Math.max(1, bandTop - domeTop);
    const hw = headHW * Math.sqrt(Math.max(0.1, 1 - (1 - t) ** 2));
    for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - cx) <= hw) g[y][x] = "k";
  }
  rect(g, bandTop, bandTop + 3, Math.round(cx - headHW - 1), Math.round(cx + headHW), "K");
  for (let x = 0; x < W; x++) if (x % 3 === 2) for (let y = bandTop; y <= bandTop + 3; y++) if (g[y][x] === "K") g[y][x] = "s";
  outline(g);
  put(g, domeTop + 1, Math.round(cx) - 4, "K"); put(g, domeTop + 2, Math.round(cx) + 3, "K");
  return g;
}

// ── ÓCULOS: aro redondo sobre cada olho medido ───────────────────────────────
export function genGlasses() {
  const g = grid();
  // lentes menores que os olhos (óculos redondo sobre olho gigante)
  const rr = Math.min(5.8, (M.eyeR.cx - M.eyeL.cx) / 2 - 0.1);
  for (const eye of [M.eyeL, M.eyeR]) {
    fillEllipse(g, eye.cx, eye.cy, rr, rr, "R");
    fillEllipse(g, eye.cx, eye.cy, rr - 1.3, rr - 1.3, "L");
  }
  const yb = Math.round(M.eyeL.cy) - 2;
  rect(g, yb, yb, 1, Math.round(M.eyeL.cx - rr), "R");  // hastes
  rect(g, yb, yb, Math.round(M.eyeR.cx + rr), W - 2, "R");
  for (const eye of [M.eyeL, M.eyeR]) {
    fillEllipse(g, eye.cx + eye.r * 0.4, eye.cy - eye.r * 0.5, 1.4, 1.4, "w");
    put(g, Math.round(eye.cy - eye.r * 0.1), Math.round(eye.cx - eye.r * 0.3), "G");
    put(g, Math.round(eye.cy + eye.r * 0.1), Math.round(eye.cx - eye.r * 0.5), "G");
  }
  return g;
}

// ── CASACO: painéis seguindo a borda medida do corpo ─────────────────────────
export function genCoat() {
  const g = grid();
  const shoulder = Math.round(H * 0.52), hem = H - 8;
  for (let y = shoulder; y <= hem; y++) {
    const [lo, hi] = M.edges[y];
    if (lo < 0) continue;
    rect(g, y, y, Math.max(0, lo - 1), lo + 4, "C");
    rect(g, y, y, hi - 4, Math.min(W - 1, hi + 1), "C");
  }
  // gola: pontas chunky alargando para baixo, abraçando a borda do corpo
  for (let i = 0; i < 5; i++) {
    const y = shoulder - 5 + i;
    const [lo, hi] = M.edges[y][0] >= 0 ? M.edges[y] : M.edges[shoulder];
    rect(g, y, y, lo - 1 + Math.max(0, 2 - i), lo + 1 + i, "C");
    rect(g, y, y, hi - 1 - i, hi + 1 - Math.max(0, 2 - i), "C");
  }
  // barra inferior alargada
  const [blo, bhi] = M.edges[hem];
  rect(g, hem + 1, hem + 3, Math.max(0, blo - 2), blo + 6, "C");
  rect(g, hem + 1, hem + 3, bhi - 6, Math.min(W - 1, bhi + 2), "C");
  outline(g);
  // dobras
  for (let y = shoulder + 1; y <= hem; y++) {
    const [lo, hi] = M.edges[y];
    if (lo < 0) continue;
    if (g[y][lo + 3] === "C") g[y][lo + 3] = "D";
    if (g[y][hi - 3] === "C") g[y][hi - 3] = "D";
  }
  // mãos saindo das mangas
  const hy = hem - 1;
  fillEllipse(g, M.edges[hy][0] + 3, hy, 2.0, 2.0, "m");
  fillEllipse(g, M.edges[hy][1] - 3, hy, 2.0, 2.0, "m");
  outline(g, ["m"]);
  return g;
}

// ── emite sprites.js ─────────────────────────────────────────────────────────
const rows = g => g.map(r => `    "${r.join("")}",`).join("\n");

const content = `// ─── Sprites pixel art do Gopher (grade ${W}×${H}) ────────────────────────────────
// BASE importada da arte do usuário (src/assets/gopher.png → tools/avatar/gopher_base.json).
// Itens desenhados por medição sobre a base. Regenerar: node tools/avatar/build_sprites.mjs

export const GRID_W = ${W};
export const GRID_H = ${H};

// Skins trocam os 4 tons do corpo (b=corpo, d=sombra, l=sombra profunda, e=anel dos olhos)
export const SKINS = {
  skin_azul:    { name: "Azul Clássico", b: "#8ce8f8", d: "#56c6d6", l: "#42a0b9", e: "#186378" },
  skin_aqua:    { name: "Aqua",          b: "#57c2d4", d: "#3fa3b6", l: "#2e8496", e: "#1d5c6c" },
  skin_cinza:   { name: "Cinza",         b: "#aeb6c0", d: "#868e99", l: "#666e79", e: "#454b55" },
  skin_roxo:    { name: "Roxo",          b: "#bfa0e8", d: "#9878cc", l: "#7a58ab", e: "#533a78" },
  skin_marinho: { name: "Azul Royal",    b: "#7c9ce0", d: "#5878c4", l: "#4058a0", e: "#2c3d74" },
  skin_rosa:    { name: "Rosa",          b: "#f2aac6", d: "#d688a8", l: "#b06888", e: "#7d4560" },
};

export const DEFAULT_SKIN = "skin_azul";

// Cores comuns a todas as skins
const COMMON = {
  o: "#091717", // contorno / pupila
  w: "#f8f8f8", // branco (olhos e dentes)
  m: "#f8e8b9", // tan (focinho, mãos, pés)
  F: "#d6a878", // tan escuro (dedinhos)
};

// ─── Gopher base (arte do usuário) ───────────────────────────────────────────
export const BASE = [
${rows(genBase())}
];

// ─── Itens ───────────────────────────────────────────────────────────────────
const BEANIE_BLACK = {
  palette: { k: "#191a24", K: "#2a2c3c", s: "#0e0f16" },
  rows: [
${rows(genBeanie())}
  ],
};

const GLASSES_ROUND = {
  palette: { R: "#1c1e28", L: "#07080d", G: "#3a3f52", w: "#ffffff" },
  rows: [
${rows(genGlasses())}
  ],
};

const COAT_BLACK = {
  palette: { C: "#1b1d29", D: "#2c2f42", S: "#0d0e15" },
  rows: [
${rows(genCoat())}
  ],
};

export const ITEM_SPRITES = {
  hat_beanie_black: BEANIE_BLACK,
  glasses_round_black: GLASSES_ROUND,
  outfit_coat_black: COAT_BLACK,
};

export const ITEMS = [
  { id: "hat_beanie_black",    name: "Gorro Preto",    slot: "hat" },
  { id: "glasses_round_black", name: "Óculos Redondo", slot: "glasses" },
  { id: "outfit_coat_black",   name: "Casaco Trench",  slot: "outfit" },
];

// Ordem de pintura: corpo → casaco → óculos → gorro
export const LAYER_ORDER = ["outfit", "glasses", "hat"];

function paintSprite(ctx, rowsData, palette, scale) {
  for (let y = 0; y < rowsData.length; y++) {
    const row = rowsData[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

export function drawAvatar(ctx, { skin, hat, glasses, outfit }, scale) {
  const skinDef = SKINS[skin] || SKINS[DEFAULT_SKIN];
  const basePalette = { ...COMMON, b: skinDef.b, d: skinDef.d, l: skinDef.l, e: skinDef.e };
  ctx.clearRect(0, 0, GRID_W * scale, GRID_H * scale);
  paintSprite(ctx, BASE, basePalette, scale);
  const equipped = { outfit, glasses, hat };
  for (const slot of LAYER_ORDER) {
    const itemID = equipped[slot];
    if (!itemID || !ITEM_SPRITES[itemID]) continue;
    const sprite = ITEM_SPRITES[itemID];
    paintSprite(ctx, sprite.rows, { ...COMMON, m: "#f8e8b9", ...sprite.palette }, scale);
  }
}
`;

writeFileSync(`${HERE}/../../src/avatar/sprites.js`, content);
console.log(`sprites.js gerado (${W}x${H}) — olhos: L(${M.eyeL.cx.toFixed(1)},${M.eyeL.cy.toFixed(1)} r${M.eyeL.r.toFixed(1)}) R(${M.eyeR.cx.toFixed(1)},${M.eyeR.cy.toFixed(1)})`);

// ── preview PNG ──────────────────────────────────────────────────────────────
const PAL = {
  o: "#091717", b: "#8ce8f8", d: "#56c6d6", l: "#42a0b9", e: "#186378",
  w: "#f8f8f8", m: "#f8e8b9", F: "#d6a878",
  k: "#191a24", K: "#2a2c3c", s: "#0e0f16", R: "#1c1e28", L: "#07080d", G: "#3a3f52",
  C: "#1b1d29", D: "#2c2f42", S: "#0d0e15",
};
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };
const layersList = [[genBase()], [genBase(), genCoat(), genGlasses(), genBeanie()]];
const S = 9, sep = 2, PW = layersList.length * W * S + sep * S, PH = H * S;
const raw = Buffer.alloc(PH * (1 + PW * 4));
const bghex = [0x3a, 0x2a, 0x4a];
for (let y = 0; y < PH; y++) {
  const rs = y * (1 + PW * 4);
  for (let x = 0; x < PW; x++) {
    const gi = Math.floor(x / ((W + sep) * S));
    const lx = x - gi * (W + sep) * S;
    let rgb = bghex;
    if (gi < layersList.length && lx < W * S) {
      const layers = layersList[gi];
      for (let li = layers.length - 1; li >= 0; li--) {
        const ch = layers[li][Math.floor(y / S)][Math.floor(lx / S)];
        if (ch !== ".") { rgb = [1, 3, 5].map(i => parseInt(PAL[ch].slice(i, i + 2), 16)); break; }
      }
    }
    const o = rs + 1 + x * 4;
    raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; raw[o + 3] = 255;
  }
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(PW, 0); ihdr.writeUInt32BE(PH, 4); ihdr[8] = 8; ihdr[9] = 6;
writeFileSync(`${HERE}/preview.png`, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log("preview:", `${HERE}preview.png`);
