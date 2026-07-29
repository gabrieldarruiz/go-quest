// Exporta a base e cada item como PNG 1x (canvas do jogo, fundo transparente)
// para edição no Aseprite. Saída: tools/avatar/layers/ e ~/Downloads/PixelArt/gopher-layers/
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { homedir } from "node:os";
import { GRID_W, GRID_H, BASE, SKINS, DEFAULT_SKIN, COMMON, ITEM_SPRITES } from "../../src/avatar/sprites.js";

const HERE = new URL(".", import.meta.url).pathname;
const OUT = `${HERE}/layers`;
const DL = `${homedir()}/Downloads/PixelArt/gopher-layers`;
mkdirSync(OUT, { recursive: true });
mkdirSync(DL, { recursive: true });

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

function writeSprite(name, rows, palette) {
  const raw = Buffer.alloc(GRID_H * (1 + GRID_W * 4));
  for (let y = 0; y < GRID_H; y++) {
    const rs = y * (1 + GRID_W * 4);
    for (let x = 0; x < GRID_W; x++) {
      const ch = rows[y][x];
      const o = rs + 1 + x * 4;
      if (ch === "." || !palette[ch]) { raw[o + 3] = 0; continue; }
      const [r, g, b] = hex2rgb(palette[ch]);
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(GRID_W, 0); ihdr.writeUInt32BE(GRID_H, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
  writeFileSync(`${OUT}/${name}.png`, png);
  copyFileSync(`${OUT}/${name}.png`, `${DL}/${name}.png`);
  console.log(`exportado: ${name}.png`);
}

const skin = SKINS[DEFAULT_SKIN];
writeSprite("gopher_base", BASE, { ...COMMON, b: skin.b, d: skin.d, l: skin.l, e: skin.e });
for (const [id, sprite] of Object.entries(ITEM_SPRITES)) {
  writeSprite(id, sprite.rows, { ...COMMON, ...sprite.palette });
}

const readme = `GOPHER — COMO DESENHAR ITENS (Aseprite)

1. Abra gopher_base.png (canvas ${GRID_W}x${GRID_H} — 1 pixel = 1 pixel do jogo).
2. Crie uma CAMADA NOVA por item e desenhe por cima da base (ela serve de guia de alinhamento).
   Os PNGs dos itens atuais estão aqui também — pode abrir como camada e corrigir em vez de começar do zero.
3. Para exportar um item: esconda a camada da base (e as outras), deixe só o item visível,
   e File > Export As... PNG com o MESMO canvas ${GRID_W}x${GRID_H}, fundo transparente, escala 100%.
4. Salve com o nome do item em tools/avatar/items/ do projeto (ou me mande o arquivo):
   hat_goku.png, outfit_goku.png, hat_straw.png, outfit_luffy.png,
   hat_beanie_black.png, glasses_round_black.png, outfit_coat_black.png
5. Rode: node tools/avatar/build_sprites.mjs  (ou me pede) — o jogo passa a usar a SUA arte.

Item novo (que não existe ainda)? Me fala o nome/slot que eu registro no catálogo.
`;
writeFileSync(`${OUT}/LEIA-ME.txt`, readme);
copyFileSync(`${OUT}/LEIA-ME.txt`, `${DL}/LEIA-ME.txt`);
console.log(`\ntudo copiado para ${DL}`);
