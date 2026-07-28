// Importa um PNG de pixel art e vira matriz de sprite (pixels exatos do arquivo).
// Uso:
//   node import_png.mjs <arquivo.png>              → export 1x (1 pixel = 1 célula)
//   node import_png.mjs <arquivo.png> --width 48   → imagem upscalada; 48 = largura lógica
// Saída: imprime a paleta encontrada e grava <arquivo>.rows.json com { palette, rows }.
import { inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

export function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("não é PNG");
  let pos = 8, w = 0, h = 0, bitDepth = 0, colorType = 0, palette = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
      if (data[12] !== 0) throw new Error("PNG entrelaçado não suportado");
      if (bitDepth !== 8) throw new Error(`bit depth ${bitDepth} não suportado (use 8)`);
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const bpp = channels;
  const stride = w * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(h * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      cur[x] = v & 0xff;
    }
  }
  // normaliza para RGBA
  const px = (x, y) => {
    const i = y * stride + x * channels;
    if (colorType === 6) return [out[i], out[i + 1], out[i + 2], out[i + 3]];
    if (colorType === 2) return [out[i], out[i + 1], out[i + 2], 255];
    if (colorType === 0) return [out[i], out[i], out[i], 255];
    if (colorType === 4) return [out[i], out[i], out[i], out[i + 1]];
    if (colorType === 3) {
      const idx = out[i];
      return [palette[idx * 3], palette[idx * 3 + 1], palette[idx * 3 + 2], trns && idx < trns.length ? trns[idx] : 255];
    }
    throw new Error(`color type ${colorType} não suportado`);
  };
  return { w, h, px };
}

const isCLI = process.argv[1] && process.argv[1].endsWith("import_png.mjs");
const file = isCLI ? process.argv[2] : null;
if (isCLI && !file) { console.log("uso: node import_png.mjs <arquivo.png> [--width N]"); process.exit(1); }
if (!isCLI) {
  // importado como módulo: só exporta decodePNG
} else {
const wIdx = process.argv.indexOf("--width");
const logicalW = wIdx > -1 ? parseInt(process.argv[wIdx + 1], 10) : null;

const img = decodePNG(readFileSync(file));
const cell = logicalW ? img.w / logicalW : 1;
const LW = logicalW || img.w;
const LH = Math.round(img.h / cell);
console.log(`imagem ${img.w}x${img.h} → grade lógica ${LW}x${LH} (célula ${cell.toFixed(2)}px)`);

// amostra 5 pontos por célula e vota na cor mais comum (aguenta upscale com ruído)
function sampleCell(cx, cy) {
  const votes = new Map();
  const offs = [[0.5, 0.5], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]];
  for (const [ox, oy] of offs) {
    const x = Math.min(img.w - 1, Math.floor((cx + ox) * cell));
    const y = Math.min(img.h - 1, Math.floor((cy + oy) * cell));
    const [r, g, b, a] = img.px(x, y);
    // quantiza levemente para agrupar ruído de compressão
    const key = a < 128 ? "T" : `${r >> 3},${g >> 3},${b >> 3}`;
    votes.set(key, (votes.get(key) || 0) + 1);
  }
  return [...votes.entries()].sort((p, q) => q[1] - p[1])[0][0];
}

// varre a grade, montando paleta por frequência
const cells = [];
const freq = new Map();
for (let y = 0; y < LH; y++) {
  const row = [];
  for (let x = 0; x < LW; x++) {
    const k = sampleCell(x, y);
    row.push(k);
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  cells.push(row);
}

// fundo: transparente, ou a cor dos 4 cantos se não houver alpha
let bg = "T";
if (!freq.has("T")) {
  const corners = [cells[0][0], cells[0][LW - 1], cells[LH - 1][0], cells[LH - 1][LW - 1]];
  bg = corners.sort((a, b) => corners.filter(c => c === b).length - corners.filter(c => c === a).length)[0];
  console.log(`sem alpha — usando cor dos cantos como fundo: ${bg}`);
}

// atribui um caractere por cor (mais frequente primeiro)
const CHARS = "obdlmwptfnkKsRLGCDSNFe123456789";
const colorKeys = [...freq.entries()].filter(([k]) => k !== bg).sort((a, b) => b[1] - a[1]).map(([k]) => k);
if (colorKeys.length > CHARS.length) console.log(`aviso: ${colorKeys.length} cores (>${CHARS.length}) — junte cores parecidas no Aseprite`);
const charOf = new Map(colorKeys.map((k, i) => [k, CHARS[i] || "?"]));
const hexOf = k => {
  if (k === "T") return "transparente";
  const [r, g, b] = k.split(",").map(v => (parseInt(v, 10) << 3) + 4);
  return `#${[r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, "0")).join("")}`;
};

const rows = cells.map(row => row.map(k => (k === bg ? "." : charOf.get(k))).join(""));
const paletteOut = Object.fromEntries(colorKeys.map(k => [charOf.get(k), hexOf(k)]));

console.log("\npaleta detectada (char → cor → nº de células):");
for (const k of colorKeys) console.log(`  ${charOf.get(k)} → ${hexOf(k)} (${freq.get(k)})`);
console.log("\npreview:");
for (const r of rows) console.log("  " + r);

const outFile = file.replace(/\.png$/i, "") + ".rows.json";
writeFileSync(outFile, JSON.stringify({ width: LW, height: LH, palette: paletteOut, rows }, null, 2));
console.log(`\ngravado: ${outFile}`);
}
