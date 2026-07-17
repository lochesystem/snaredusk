/**
 * Gera PNGs placeholder 32×32 para criaturas (substitua por arte final).
 * Uso: node scripts/generate-creature-placeholders.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'creatures');

const TRANSPARENT = [0, 0, 0, 0];

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(filePath, width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(filePath, png);
}

function makeCanvas(w, h) {
  const data = Buffer.alloc(w * h * 4);
  const idx = (x, y) => (y * w + x) * 4;
  const set = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = idx(x, y);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  };
  const fillRect = (x0, y0, rw, rh, color) => {
    for (let y = y0; y < y0 + rh; y++) {
      for (let x = x0; x < x0 + rw; x++) set(x, y, color);
    }
  };
  const fillCircle = (cx, cy, r, color) => {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, color);
      }
    }
  };
  return { data, set, fillRect, fillCircle };
}

const OUTLINE = [26, 46, 26, 255];

function drawLumimorcego() {
  const { data, fillCircle, set } = makeCanvas(32, 32);
  fillCircle(16, 14, 9, [93, 187, 99, 255]);
  fillCircle(10, 10, 5, [196, 240, 130, 200]);
  fillCircle(22, 10, 5, [196, 240, 130, 200]);
  set(12, 13, [26, 46, 26, 255]);
  set(20, 13, [26, 46, 26, 255]);
  set(15, 16, [196, 240, 130, 255]);
  for (let y = 8; y < 22; y++) {
    set(7, y, OUTLINE);
    set(24, y, OUTLINE);
  }
  return data;
}

function drawEsporoDorminhoco() {
  const { data, fillCircle, set } = makeCanvas(32, 32);
  fillCircle(16, 18, 8, [61, 92, 58, 255]);
  fillCircle(16, 10, 6, [143, 216, 148, 255]);
  set(14, 9, OUTLINE);
  set(18, 9, OUTLINE);
  set(13, 11, [143, 216, 148, 255]);
  set(19, 11, [143, 216, 148, 255]);
  return data;
}

function drawCarapacaMusgo() {
  const { data, fillCircle, fillRect, set } = makeCanvas(32, 32);
  // casco largo (silhueta de tartaruga com musgo)
  fillCircle(18, 17, 11, [74, 106, 74, 255]);
  fillRect(8, 14, 8, 7, [74, 106, 74, 255]);
  fillCircle(9, 16, 4, [107, 154, 107, 255]);
  fillCircle(20, 14, 3, [107, 154, 107, 255]);
  fillCircle(22, 19, 2, [143, 216, 148, 180]);
  fillCircle(15, 20, 2, [143, 216, 148, 180]);
  fillCircle(7, 16, 3, [61, 92, 58, 255]);
  set(6, 15, [26, 46, 26, 255]);
  set(7, 14, [26, 46, 26, 255]);
  set(5, 16, [26, 46, 26, 255]);
  // contorno do casco
  for (let x = 7; x <= 28; x++) {
    set(x, 8, OUTLINE);
    set(x, 27, OUTLINE);
  }
  for (let y = 8; y <= 27; y++) {
    set(7, y, OUTLINE);
    set(28, y, OUTLINE);
  }
  return data;
}

function drawReiEsporas() {
  const { data, fillCircle, set } = makeCanvas(32, 32);
  fillCircle(16, 18, 10, [107, 74, 138, 255]);
  fillCircle(16, 8, 7, [196, 240, 130, 255]);
  fillCircle(10, 6, 2, [196, 240, 130, 255]);
  fillCircle(22, 6, 2, [196, 240, 130, 255]);
  fillCircle(16, 4, 2, [196, 240, 130, 255]);
  set(14, 9, OUTLINE);
  set(18, 9, OUTLINE);
  set(13, 11, [232, 93, 74, 255]);
  set(19, 11, [232, 93, 74, 255]);
  return data;
}

const CREATURES = {
  lumimorcego: drawLumimorcego,
  esporo_dorminhoco: drawEsporoDorminhoco,
  carapaca_musgo: drawCarapacaMusgo,
  rei_esporas: drawReiEsporas,
};

mkdirSync(OUT_DIR, { recursive: true });

for (const [id, draw] of Object.entries(CREATURES)) {
  const path = join(OUT_DIR, `${id}.png`);
  writePng(path, 32, 32, draw());
  console.log(`wrote ${path}`);
}
