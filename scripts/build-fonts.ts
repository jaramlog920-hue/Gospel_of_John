// 갈무리 BDF에서 비트맵 폰트(PNG + BMFont XML)를 만든다.
// 캔버스로 TTF를 그리면 브라우저(특히 iOS)마다 가장자리를 부드럽게 다듬어 흐릿해진다.
// 도트를 그대로 찍어 둔 비트맵 폰트는 어느 기기에서나 또렷하다.
// 본문·게임 텍스트에 쓰인 글자만 모아 담는다. `npm run dev`/`build` 전에 자동으로 실행된다.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

interface Glyph {
  code: number;
  adv: number;
  w: number;
  h: number;
  xoff: number;
  yoff: number;
  rows: string[];
}

function parseBdf(file: string) {
  const lines = readFileSync(file, 'latin1').split('\n');
  const glyphs = new Map<number, Glyph>();
  let ascent = 0;
  let descent = 0;
  let g: Partial<Glyph> & { rows?: string[] } = {};
  let inBitmap = false;
  for (const line of lines) {
    const [key, ...rest] = line.trim().split(' ');
    if (key === 'FONT_ASCENT') ascent = Number(rest[0]);
    else if (key === 'FONT_DESCENT') descent = Number(rest[0]);
    else if (key === 'STARTCHAR') g = { rows: [] };
    else if (key === 'ENCODING') g.code = Number(rest[0]);
    else if (key === 'DWIDTH') g.adv = Number(rest[0]);
    else if (key === 'BBX') [g.w, g.h, g.xoff, g.yoff] = rest.map(Number);
    else if (key === 'BITMAP') inBitmap = true;
    else if (key === 'ENDCHAR') {
      inBitmap = false;
      if (g.code !== undefined && g.code >= 0) glyphs.set(g.code, g as Glyph);
    } else if (inBitmap) g.rows!.push(key);
  }
  return { glyphs, ascent, descent };
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : [p];
  });
}

/** 게임에서 쓰는 모든 글자: 본문 + src 안의 문자열 + 출력 가능한 ASCII */
export function usedCharset(): Set<number> {
  const set = new Set<number>();
  for (let c = 32; c < 127; c++) set.add(c);
  const sources = ['data/john_krv.json', ...listFiles('src').filter((f) => /\.(ts|json)$/.test(f))];
  for (const f of sources) for (const ch of readFileSync(f, 'utf8')) set.add(ch.codePointAt(0)!);
  return set;
}

// ── 아주 작은 PNG 인코더(RGBA) ──
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w: number, h: number, rgba: Uint8Array) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function buildFont(bdfFile: string, name: string, outDir: string, charset: Set<number>) {
  const { glyphs, ascent, descent } = parseBdf(bdfFile);
  const chosen = [...charset].filter((c) => glyphs.has(c)).sort((a, b) => a - b);
  const missing = [...charset].filter((c) => !glyphs.has(c) && c >= 32);

  // 줄 단위로 채워 넣기(글자 사이 1px 여백)
  const W = 1024;
  let x = 1;
  let y = 1;
  let rowH = 0;
  const placed: { g: Glyph; x: number; y: number }[] = [];
  for (const code of chosen) {
    const g = glyphs.get(code)!;
    if (x + g.w + 1 > W) {
      x = 1;
      y += rowH + 1;
      rowH = 0;
    }
    placed.push({ g, x, y });
    x += g.w + 1;
    rowH = Math.max(rowH, g.h);
  }
  const H = 2 ** Math.ceil(Math.log2(y + rowH + 1));
  const rgba = new Uint8Array(W * H * 4);
  for (const { g, x: gx, y: gy } of placed) {
    g.rows.forEach((hex, r) => {
      const bits = BigInt('0x' + hex);
      const nbits = hex.length * 4;
      for (let c = 0; c < g.w; c++) {
        if ((bits >> BigInt(nbits - 1 - c)) & 1n) {
          const i = ((gy + r) * W + gx + c) * 4;
          rgba.set([255, 255, 255, 255], i);
        }
      }
    });
  }

  const lineHeight = ascent + descent;
  const chars = placed
    .map(
      ({ g, x: gx, y: gy }) =>
        `<char id="${g.code}" x="${gx}" y="${gy}" width="${g.w}" height="${g.h}" xoffset="${g.xoff}" yoffset="${ascent - g.yoff - g.h}" xadvance="${g.adv}" page="0" chnl="15"/>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0"?>
<font>
<info face="${name}" size="${lineHeight}"/>
<common lineHeight="${lineHeight}" base="${ascent}" scaleW="${W}" scaleH="${H}" pages="1"/>
<pages><page id="0" file="${name}.png"/></pages>
<chars count="${placed.length}">
${chars}
</chars>
</font>
`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.png`), encodePng(W, H, rgba));
  writeFileSync(join(outDir, `${name}.xml`), xml);
  return { count: placed.length, missing, size: `${W}x${H}` };
}

if (process.argv[1]?.endsWith('build-fonts.ts')) {
  const charset = usedCharset();
  for (const [bdf, name] of [
    ['node_modules/galmuri/dist/Galmuri11.bdf', 'galmuri11'],
    ['node_modules/galmuri/dist/Galmuri9.bdf', 'galmuri9'],
  ]) {
    const r = buildFont(bdf, name, 'public/assets/fonts/gen', charset);
    // 주석에만 쓰는 기호처럼 폰트에 없는 글자는 화면에 나오지 않으므로 알려만 준다.
    const shown = r.missing.filter((c) => c > 0x7f).map((c) => String.fromCodePoint(c));
    console.log(`✓ ${name}: ${r.count}자, ${r.size}${shown.length ? ` (폰트에 없는 글자 ${shown.length}개: ${shown.join('')})` : ''}`);
  }
}
