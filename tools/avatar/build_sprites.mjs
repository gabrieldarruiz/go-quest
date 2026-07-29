// Gera src/avatar/sprites.js a partir da ARTE DO USUÁRIO (gopher_base.json,
// importada de src/assets/gopher.png via import_reference.mjs).
// Itens: se existir tools/avatar/items/<id>.png (1x, canvas igual ao do jogo,
// fundo transparente), usa a arte desenhada à mão; senão desenha procedural.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { decodePNG } from "./import_png.mjs";

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
const PAD_L = 2, PAD_T = 8, PAD_B = 2;
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

// ── CABELO SAIYAJIN: topete espetado preto sobre a cabeça ────────────────────
export function genGokuHair() {
  const g = grid();
  const eyeTop = Math.round(M.eyeL.cy - M.eyeL.r);
  // base do cabelo cobrindo o topo da cabeça (segue a borda medida)
  for (let y = M.headTop; y < eyeTop; y++) {
    const [lo, hi] = M.edges[y];
    if (lo < 0) continue;
    rect(g, y, y, lo, hi, "k");
  }
  // espigões separados com alturas escalonadas (vales visíveis entre eles)
  const cx = W / 2;
  const spikes = [
    [cx - 12, 4, 0.75], [cx - 6, 6, 0.7], [cx, 8, 0.65],
    [cx + 6, 6, 0.7], [cx + 12, 4, 0.75],
  ];
  for (const [sx, h, slope] of spikes) {
    const peak = M.headTop - h;
    for (let y = peak; y < M.headTop + 2; y++) {
      const hw = Math.max(0, (y - peak) * slope + 0.4);
      rect(g, y, y, Math.round(sx - hw), Math.round(sx + hw), "k");
    }
  }
  outline(g);
  // brilhos
  put(g, M.headTop - 3, Math.round(cx - 3), "K");
  put(g, M.headTop - 2, Math.round(cx + 2), "K");
  put(g, M.headTop - 1, Math.round(cx - 7), "K");
  return g;
}

// ── CHAPÉU DE PALHA: domo amarelo, fita vermelha, aba larga ──────────────────
export function genStrawHat() {
  const g = grid();
  const eyeTop = Math.round(M.eyeL.cy - M.eyeL.r);
  const brimY = eyeTop - 3;
  const bandTop = brimY - 2;
  const domeTop = Math.max(0, bandTop - 6);
  const cx = W / 2;
  const headHW = (M.edges[eyeTop][1] - M.edges[eyeTop][0]) / 2;
  // domo alto e redondo
  for (let y = domeTop; y < bandTop; y++) {
    const t = (y - domeTop) / Math.max(1, bandTop - domeTop);
    const hw = (headHW - 2) * Math.sqrt(Math.max(0.15, 1 - (1 - t) ** 2));
    for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - cx) <= hw) g[y][x] = "Y";
  }
  // fita vermelha (2 linhas)
  rect(g, bandTop, bandTop + 1, Math.round(cx - headHW + 2), Math.round(cx + headHW - 3), "r");
  // aba larga e grossa
  rect(g, brimY, brimY + 2, Math.max(1, Math.round(cx - headHW - 5)), Math.min(W - 2, Math.round(cx + headHW + 4)), "Y");
  outline(g);
  // trama da palha
  for (let x = 3; x < W - 3; x += 3) { if (g[brimY + 1][x] === "Y") g[brimY + 1][x] = "y"; }
  put(g, domeTop + 2, Math.round(cx - 4), "y"); put(g, domeTop + 3, Math.round(cx + 3), "y"); put(g, domeTop + 1, Math.round(cx + 1), "y");
  return g;
}

// ── GI LARANJA: túnica no tronco com gola V e faixa azul ─────────────────────
export function genGokuGi() {
  const g = grid();
  const top = Math.round(H * 0.66), sash = Math.round(H * 0.79), hem = Math.round(H * 0.86);
  for (let y = top; y <= hem; y++) {
    const [lo, hi] = M.edges[y];
    if (lo < 0) continue;
    rect(g, y, y, lo, hi, "C");
  }
  // gola V com camiseta azul por baixo
  const cx = Math.floor(W / 2);
  for (let i = 0; i < 3; i++) rect(g, top + i, top + i, cx - 3 + i, cx + 2 - i, "B");
  // faixa azul
  for (let y = sash; y <= sash + 1; y++) {
    const [lo, hi] = M.edges[y];
    rect(g, y, y, lo + 1, hi - 1, "B");
  }
  outline(g);
  // amarração da faixa
  put(g, sash + 2, cx - 1, "B"); put(g, sash + 2, cx, "B"); put(g, sash + 3, cx - 2, "B");
  // dobras
  for (let y = top + 2; y < sash - 1; y++) {
    const [lo, hi] = M.edges[y];
    if (g[y][lo + 3] === "C") g[y][lo + 3] = "D";
    if (g[y][hi - 3] === "C") g[y][hi - 3] = "S";
  }
  return g;
}

// ── COLETE DO PIRATA: colete vermelho aberto ─────────────────────────────────
export function genLuffyVest() {
  const g = grid();
  const top = Math.round(H * 0.64), hem = Math.round(H * 0.88);
  for (let y = top; y <= hem; y++) {
    const [lo, hi] = M.edges[y];
    if (lo < 0) continue;
    rect(g, y, y, Math.max(0, lo - 1), lo + 5, "C");
    rect(g, y, y, hi - 5, Math.min(W - 1, hi + 1), "C");
  }
  // ombros fechando no pescoço
  const [slo, shi] = M.edges[top];
  rect(g, top - 1, top - 1, slo + 1, slo + 7, "C");
  rect(g, top - 1, top - 1, shi - 7, shi - 1, "C");
  outline(g);
  // dobras
  for (let y = top + 1; y < hem; y++) {
    const [lo, hi] = M.edges[y];
    if (lo < 0) continue;
    if (g[y][lo + 3] === "C") g[y][lo + 3] = "D";
    if (g[y][hi - 3] === "C") g[y][hi - 3] = "S";
  }
  return g;
}

// ── monta os itens: PNG desenhado à mão (items/<id>.png) ou procedural ───────
const ITEM_DEFS = [
  { id: "hat_beanie_black",    name: "Gorro Preto",      slot: "hat",     gen: genBeanie,    palette: { k: "#191a24", K: "#2a2c3c", s: "#0e0f16" } },
  { id: "hat_goku",            name: "Cabelo Saiyajin",  slot: "hat",     gen: genGokuHair,  palette: { k: "#16161e", K: "#30323f" } },
  { id: "hat_straw",           name: "Chapéu de Palha",  slot: "hat",     gen: genStrawHat,  palette: { Y: "#e8c86a", y: "#c8a44a", r: "#c83232" } },
  { id: "glasses_round_black", name: "Óculos Redondo",   slot: "glasses", gen: genGlasses,   palette: { R: "#1c1e28", L: "#07080d", G: "#3a3f52", w: "#ffffff" } },
  { id: "outfit_coat_black",   name: "Casaco Trench",    slot: "outfit",  gen: genCoat,      palette: { C: "#1b1d29", D: "#2c2f42", S: "#0d0e15" } },
  { id: "outfit_goku",         name: "Gi Laranja",       slot: "outfit",  gen: genGokuGi,    palette: { C: "#e8862c", D: "#f2a04c", S: "#c26a1e", B: "#2a4a8a" } },
  { id: "outfit_luffy",        name: "Colete do Pirata", slot: "outfit",  gen: genLuffyVest, palette: { C: "#d83030", D: "#ef5a4a", S: "#a82424" } },
];

const CHAR_POOL = "abcdefghijknpqrstuvxyzABCDEGHIJKLMNOPQRSTUVXYZ0123456789";
function loadHandDrawn(id) {
  const p = `${HERE}/items/${id}.png`;
  if (!existsSync(p)) return null;
  const img = decodePNG(readFileSync(p));
  if (img.w !== W || img.h !== H) {
    console.log(`AVISO: items/${id}.png é ${img.w}x${img.h}, esperado ${W}x${H} — ignorando`);
    return null;
  }
  const colorChar = new Map(), palette = {};
  let next = 0;
  const rowsArr = [];
  for (let y = 0; y < H; y++) {
    let r = "";
    for (let x = 0; x < W; x++) {
      const [cr, cg, cb, ca] = img.px(x, y);
      if (ca < 128) { r += "."; continue; }
      const hex = "#" + [cr, cg, cb].map(v => v.toString(16).padStart(2, "0")).join("");
      if (!colorChar.has(hex)) {
        const ch = CHAR_POOL[next++];
        if (!ch) throw new Error(`items/${id}.png tem cores demais (max ${CHAR_POOL.length})`);
        colorChar.set(hex, ch);
        palette[ch] = hex;
      }
      r += colorChar.get(hex);
    }
    rowsArr.push(r);
  }
  console.log(`item ${id}: usando PNG desenhado à mão (${colorChar.size} cores)`);
  return { palette, rows: rowsArr };
}

const gridRows = g => g.map(r => r.join(""));
const itemsData = ITEM_DEFS.map(def => ({
  ...def,
  sprite: loadHandDrawn(def.id) || { palette: def.palette, rows: gridRows(def.gen()) },
}));

// ── emite sprites.js ─────────────────────────────────────────────────────────
const fmtRows = rr => rr.map(r => `    "${r}",`).join("\n");
const fmtPal = p => Object.entries(p).map(([k, v]) => `${JSON.stringify(k)}: "${v}"`).join(", ");

const itemsSection = itemsData.map(d => `  ${d.id}: {
    palette: { ${fmtPal(d.sprite.palette)} },
    rows: [
${fmtRows(d.sprite.rows)}
    ],
  },`).join("\n");

const itemsCatalog = itemsData.map(d => `  { id: "${d.id}", name: "${d.name}", slot: "${d.slot}" },`).join("\n");

const content = `// ─── Sprites pixel art do Gopher (grade ${W}×${H}) ────────────────────────────────
// BASE importada da arte do usuário (src/assets/gopher.png → tools/avatar/gopher_base.json).
// Itens: PNG desenhado à mão em tools/avatar/items/ ou procedural por medição.
// Regenerar: node tools/avatar/build_sprites.mjs

export const GRID_W = ${W};
export const GRID_H = ${H};

// Skins trocam os 4 tons do corpo (b=corpo, d=sombra, l=sombra profunda, e=anel dos olhos)
export const SKINS = {
  // pares claro/escuro por família de cor
  skin_azul:         { name: "Azul Claro",    b: "#8ce8f8", d: "#56c6d6", l: "#42a0b9", e: "#186378" },
  skin_marinho:      { name: "Azul Royal",    b: "#7c9ce0", d: "#5878c4", l: "#4058a0", e: "#2c3d74" },
  skin_aqua:         { name: "Aqua Claro",    b: "#57c2d4", d: "#3fa3b6", l: "#2e8496", e: "#1d5c6c" },
  skin_aqua_escuro:  { name: "Aqua Escuro",   b: "#2e8b9e", d: "#226b7c", l: "#184f5d", e: "#0e3540" },
  skin_cinza:        { name: "Cinza Claro",   b: "#aeb6c0", d: "#868e99", l: "#666e79", e: "#454b55" },
  skin_cinza_escuro: { name: "Cinza Escuro",  b: "#6a7078", d: "#52575f", l: "#3d4147", e: "#26292e" },
  skin_roxo:         { name: "Roxo Claro",    b: "#bfa0e8", d: "#9878cc", l: "#7a58ab", e: "#533a78" },
  skin_roxo_escuro:  { name: "Roxo Escuro",   b: "#7a55b8", d: "#613f99", l: "#4a2e78", e: "#301c52" },
  skin_rosa:         { name: "Rosa Claro",    b: "#f2aac6", d: "#d688a8", l: "#b06888", e: "#7d4560" },
  skin_rosa_escuro:  { name: "Rosa Escuro",   b: "#d16a96", d: "#b04d78", l: "#8a375c", e: "#5c2039" },
  skin_amarelo:      { name: "Amarelo Claro", b: "#f8e88c", d: "#e0c45c", l: "#bf9c3d", e: "#8a6b1d" },
  skin_mostarda:     { name: "Mostarda",      b: "#e0b83c", d: "#bf9428", l: "#99721d", e: "#6b4e12" },
  skin_verde:        { name: "Verde Claro",   b: "#a8e8a0", d: "#78c878", l: "#55a458", e: "#2f7038" },
  skin_musgo:        { name: "Verde Musgo",   b: "#8aa860", d: "#6b8a48", l: "#4f6b34", e: "#35491f" },
  skin_marrom:       { name: "Marrom Claro",  b: "#c9a178", d: "#a87f58", l: "#855f3e", e: "#573c24" },
  skin_marrom_escuro:{ name: "Marrom Escuro", b: "#8a6242", d: "#6e4c32", l: "#523823", e: "#362214" },
};

export const DEFAULT_SKIN = "skin_azul";

// Cores comuns a todas as skins
export const COMMON = {
  o: "#091717", // contorno / pupila
  w: "#f8f8f8", // branco (olhos e dentes)
  m: "#f8e8b9", // tan (focinho, mãos, pés)
  F: "#d6a878", // tan escuro (dedinhos)
};

// ─── Gopher base (arte do usuário) ───────────────────────────────────────────
export const BASE = [
${fmtRows(gridRows(genBase()))}
];

// ─── Itens ───────────────────────────────────────────────────────────────────
export const ITEM_SPRITES = {
${itemsSection}
};

export const ITEMS = [
${itemsCatalog}
];

// Ordem de pintura: corpo → roupa → óculos → cabeça
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
    paintSprite(ctx, sprite.rows, { ...COMMON, ...sprite.palette }, scale);
  }
}
`;

writeFileSync(`${HERE}/../../src/avatar/sprites.js`, content);
console.log(`sprites.js gerado (${W}x${H}) — olhos: L(${M.eyeL.cx.toFixed(1)},${M.eyeL.cy.toFixed(1)} r${M.eyeL.r.toFixed(1)}) R(${M.eyeR.cx.toFixed(1)},${M.eyeR.cy.toFixed(1)})`);

// ── preview PNG ──────────────────────────────────────────────────────────────
const BASE_PAL = {
  o: "#091717", b: "#8ce8f8", d: "#56c6d6", l: "#42a0b9", e: "#186378",
  w: "#f8f8f8", m: "#f8e8b9", F: "#d6a878",
};
const item = id => itemsData.find(d => d.id === id).sprite;
const baseLayer = { rows: gridRows(genBase()), palette: BASE_PAL };
const asLayer = id => ({ rows: item(id).rows, palette: { ...BASE_PAL, ...item(id).palette } });
const layersList = [
  [baseLayer],
  [baseLayer, asLayer("outfit_coat_black"), asLayer("glasses_round_black"), asLayer("hat_beanie_black")],
  [baseLayer, asLayer("outfit_goku"), asLayer("hat_goku")],
  [baseLayer, asLayer("outfit_luffy"), asLayer("hat_straw")],
];

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };
const S = 9, sep = 2, PW = layersList.length * W * S + (layersList.length - 1) * sep * S, PH = H * S;
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
        const ch = layers[li].rows[Math.floor(y / S)][Math.floor(lx / S)];
        if (ch !== ".") {
          const hx = layers[li].palette[ch] || "#ff00ff";
          rgb = [1, 3, 5].map(i => parseInt(hx.slice(i, i + 2), 16));
          break;
        }
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
