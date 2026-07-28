// Gerador do gopher v3 (48×56) — referência: gopher clássico pixel art do usuário.
// Silhueta por superelipses → outline automático → detalhes.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

export const W = 48, H = 56;
const CX = 24;

const PAL = {
  o: "#10141d", b: "#a9d7e4", d: "#7fb5c9", l: "#d8edf5", e: "#6da3b8",
  m: "#e8cba4", F: "#c9a678", n: "#38271f", N: "#6b4a38",
  t: "#f6f7f9", w: "#ffffff", p: "#0d0f16", f: "#e8cba4",
  k: "#191a24", K: "#2a2c3c", s: "#0e0f16",
  R: "#1c1e28", L: "#07080d", G: "#3a3f52",
  C: "#1b1d29", D: "#2c2f42", S: "#0d0e15",
};

const grid = () => Array.from({ length: H }, () => Array(W).fill("."));

function fillEllipse(g, cx, cy, rx, ry, ch) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) g[y][x] = ch;
  }
}

// corpo: superelipse (topo largo/achatado) com leve afinada pra baixo
export function bodyHW(y, cy = 29.5, ry = 24, rxTop = 16.4, rxBot = 15.4, n = 3.0) {
  const dy = Math.abs(y + 0.5 - cy) / ry;
  if (dy > 1) return -1;
  const t = (y + 0.5 - (cy - ry)) / (2 * ry);
  const rx = rxTop + (rxBot - rxTop) * Math.min(1, t);
  return rx * Math.pow(1 - Math.pow(dy, n), 1 / n);
}
function fillBody(g, ch) {
  for (let y = 0; y < H; y++) {
    const hw = bodyHW(y);
    if (hw < 0) continue;
    for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - CX) <= hw) g[y][x] = ch;
  }
}

function outline(g, solid = null) {
  const isSolid = (y, x) => y >= 0 && y < H && x >= 0 && x < W && g[y][x] !== "." && (!solid || solid.includes(g[y][x]));
  const marks = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] === "." || (solid && !solid.includes(g[y][x]))) continue;
    if (!isSolid(y - 1, x) || !isSolid(y + 1, x) || !isSolid(y, x - 1) || !isSolid(y, x + 1)) marks.push([y, x]);
  }
  for (const [y, x] of marks) g[y][x] = "o";
}

function put(g, y, x, ch) { if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = ch; }
function rect(g, y0, y1, x0, x1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, y, x, ch); }

// ─── BASE ────────────────────────────────────────────────────────────────────
export function genBase() {
  const g = grid();
  // silhueta: orelhas + corpo + braços finos pendurados
  fillEllipse(g, 10.5, 7.5, 4.6, 4.4, "b");
  fillEllipse(g, 37.5, 7.5, 4.6, 4.4, "b");
  fillBody(g, "b");
  fillEllipse(g, 7.8, 36, 2.2, 7.5, "b");   // braço esq
  fillEllipse(g, 40.2, 36, 2.2, 7.5, "b");  // braço dir
  outline(g);
  // separação braço/corpo (linha interna)
  for (let y = 30; y <= 42; y++) { put(g, y, 10, "o"); put(g, y, 37, "o"); }
  put(g, 29, 9, "o"); put(g, 29, 38, "o");
  // sombra sutil no lado direito
  for (let y = 12; y <= 49; y++) {
    for (let x = W - 2; x > CX; x--) {
      if (g[y][x] === "b" && g[y][x + 1] === "o") { put(g, y, x, "d"); if (g[y][x - 1] === "b") put(g, y, x - 1, "d"); break; }
    }
  }
  // olhos gigantes se tocando no centro: anel → branco → pupila enorme → brilho
  fillEllipse(g, 16, 16.5, 8.0, 8.0, "o");
  fillEllipse(g, 32, 16.5, 8.0, 8.0, "o");
  fillEllipse(g, 16, 16.5, 6.8, 6.8, "w");
  fillEllipse(g, 32, 16.5, 6.8, 6.8, "w");
  fillEllipse(g, 16, 17.0, 4.6, 4.6, "p");
  fillEllipse(g, 32, 17.0, 4.6, 4.6, "p");
  fillEllipse(g, 18.0, 15.0, 1.7, 1.7, "w");
  fillEllipse(g, 30.0, 15.0, 1.7, 1.7, "w");
  // focinho + nariz preto (retângulo arredondado) por cima
  fillEllipse(g, 24, 28.2, 8.0, 3.8, "m");
  outline(g, ["m"]);
  rect(g, 22, 26, 20, 27, "o");
  put(g, 22, 20, "b"); put(g, 22, 27, "b"); put(g, 26, 20, "m"); put(g, 26, 27, "m");
  // dentes: dois blocos arredondados com vão
  rect(g, 30, 37, 18, 22, "t");
  rect(g, 30, 37, 25, 29, "t");
  outline(g, ["t"]);
  put(g, 37, 18, "."); put(g, 36, 18, "o"); put(g, 37, 19, "o");
  put(g, 37, 22, "o"); put(g, 37, 25, "o");
  put(g, 37, 29, "."); put(g, 36, 29, "o"); put(g, 37, 28, "o");
  rect(g, 30, 30, 23, 24, "o"); // fecha o vão no topo
  // mãos
  fillEllipse(g, 7.8, 43.5, 2.4, 2.3, "f");
  fillEllipse(g, 40.2, 43.5, 2.4, 2.3, "f");
  // pés grandes com dedinhos
  fillEllipse(g, 14, 51, 6.2, 3.4, "f");
  fillEllipse(g, 34, 51, 6.2, 3.4, "f");
  outline(g, ["f"]);
  put(g, 52, 12, "o"); put(g, 53, 12, "o");
  put(g, 52, 16, "o"); put(g, 53, 16, "o");
  put(g, 52, 31, "o"); put(g, 53, 31, "o");
  put(g, 52, 35, "o"); put(g, 53, 35, "o");
  return g;
}

// ─── GORRO ───────────────────────────────────────────────────────────────────
export function genBeanie() {
  const g = grid();
  // domo mais alto
  for (let y = 0; y <= 7; y++) {
    const dy = (y + 0.5 - 8) / 8;
    const hw = 15.2 * Math.sqrt(Math.max(0, 1 - dy * dy));
    for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - CX) <= hw) g[y][x] = "k";
  }
  // faixa canelada (mais larga que o domo)
  rect(g, 8, 11, 8, 39, "K");
  for (let x = 8; x <= 39; x++) if ((x - 8) % 3 === 2) for (let y = 8; y <= 11; y++) g[y][x] = "s";
  outline(g);
  // textura do domo
  put(g, 1, 17, "K"); put(g, 2, 14, "K"); put(g, 1, 30, "K"); put(g, 2, 33, "K"); put(g, 0, 24, "K");
  return g;
}

// ─── ÓCULOS ──────────────────────────────────────────────────────────────────
export function genGlasses() {
  const g = grid();
  fillEllipse(g, 16, 16.5, 8.2, 8.2, "R");
  fillEllipse(g, 32, 16.5, 8.2, 8.2, "R");
  fillEllipse(g, 16, 16.5, 6.6, 6.6, "L");
  fillEllipse(g, 32, 16.5, 6.6, 6.6, "L");
  // hastes até a lateral do corpo
  rect(g, 14, 15, 3, 7, "R");
  rect(g, 14, 15, 40, 44, "R");
  // reflexo diagonal
  fillEllipse(g, 18.8, 13.8, 1.6, 1.6, "w");
  put(g, 16, 16, "G"); put(g, 17, 15, "G"); put(g, 18, 14, "G");
  fillEllipse(g, 34.8, 13.8, 1.6, 1.6, "w");
  put(g, 16, 32, "G"); put(g, 17, 31, "G"); put(g, 18, 30, "G");
  return g;
}

// ─── CASACO ──────────────────────────────────────────────────────────────────
export function genCoat() {
  const g = grid();
  // painéis laterais acompanhando o corpo (cobrem os braços)
  for (let y = 30; y <= 50; y++) {
    const hw = bodyHW(y);
    if (hw < 0) continue;
    const lo = Math.round(CX - hw) - 2, hi = Math.round(CX + hw) + 1;
    rect(g, y, y, lo, lo + 7, "C");
    rect(g, y, y, hi - 7, hi, "C");
  }
  // gola: pontas chunky subindo ao lado das bochechas
  const collar = [
    [26, 10, 11, 36, 37],
    [27, 9, 12, 35, 38],
    [28, 8, 14, 33, 39],
    [29, 7, 15, 32, 40],
    [30, 7, 16, 31, 40],
    [31, 7, 17, 30, 40],
  ];
  for (const [y, l0, l1, r0, r1] of collar) {
    rect(g, y, y, l0, l1, "C");
    rect(g, y, y, r0, r1, "C");
  }
  // barra inferior alargada e arredondada
  rect(g, 48, 51, 5, 14, "C");
  rect(g, 48, 51, 33, 42, "C");
  put(g, 51, 5, "."); put(g, 51, 6, "."); put(g, 51, 41, "."); put(g, 51, 42, ".");
  put(g, 48, 5, "."); put(g, 48, 42, ".");
  outline(g);
  // sombras/dobras verticais
  for (let y = 31; y <= 49; y++) {
    if (g[y][7] === "C") g[y][7] = "S";
    if (g[y][40] === "C") g[y][40] = "S";
    if (g[y][12] === "C") g[y][12] = "D";
    if (g[y][35] === "C") g[y][35] = "D";
  }
  // mãos saindo das mangas
  fillEllipse(g, 10.5, 46, 2.4, 2.3, "f");
  fillEllipse(g, 37.5, 46, 2.4, 2.3, "f");
  outline(g, ["f"]);
  return g;
}

// ─── saída ───────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

export function writePNG(path, layersList, scale, bg) {
  const sep = 2;
  const n = layersList.length;
  const PW = n * W * scale + (n - 1) * sep * scale, PH = H * scale;
  const raw = Buffer.alloc(PH * (1 + PW * 4));
  const bgc = hex(bg);
  for (let y = 0; y < PH; y++) {
    const rs = y * (1 + PW * 4);
    for (let x = 0; x < PW; x++) {
      const gi = Math.floor(x / ((W + sep) * scale));
      const lx = x - gi * (W + sep) * scale;
      let rgb = bgc;
      if (gi < n && lx < W * scale) {
        const layers = layersList[gi];
        const gy = Math.floor(y / scale), gx = Math.floor(lx / scale);
        for (let li = layers.length - 1; li >= 0; li--) {
          const ch = layers[li][gy][gx];
          if (ch !== ".") { rgb = hex(PAL[ch]); break; }
        }
      }
      const o = rs + 1 + x * 4;
      raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(PW, 0); ihdr.writeUInt32BE(PH, 4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
  console.log("gerado:", path);
}

const base = genBase(), beanie = genBeanie(), glasses = genGlasses(), coat = genCoat();
const OUT = new URL(".", import.meta.url).pathname;
writePNG(`${OUT}/preview.png`, [[base], [base, coat, glasses, beanie]], 8, "#3a2a4a");
