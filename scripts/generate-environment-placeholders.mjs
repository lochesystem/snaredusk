/**
 * Gera tilesets e props placeholder 32×32 para cenário MVP.
 * Uso: node scripts/generate-environment-placeholders.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'public', 'assets');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
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
  const set = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  };
  const fillRect = (x0, y0, rw, rh, color) => {
    for (let y = y0; y < y0 + rh; y++)
      for (let x = x0; x < x0 + rw; x++) set(x, y, color);
  };
  const fillCircle = (cx, cy, r, color) => {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, color);
  };
  return { data, set, fillRect, fillCircle };
}

function tileFrame(drawFn) {
  const { data, fillRect, fillCircle, set } = makeCanvas(32, 32);
  drawFn({ fillRect, fillCircle, set });
  return data;
}

const WALL_VISIBLE_PX = 14;
const CEILING_VISIBLE_PX = 22;

/** Faixa horizontal 32×14 (tileado em paredes N/S). */
function drawWallHorizontal({ fillRect, set }, base, edge, speck) {
  fillRect(0, 0, 32, 32, [0, 0, 0, 0]);
  fillRect(0, 0, 32, WALL_VISIBLE_PX, base);
  fillRect(0, 0, 32, 3, edge);
  for (let i = 0; i < 8; i++) set(3 + (i * 5) % 26, 5 + (i * 3) % 7, speck);
}

/** Faixa vertical 14×32 (tileado em paredes L/O). */
function drawWallVertical({ fillRect, set }, base, edge, speck) {
  fillRect(0, 0, 32, 32, [0, 0, 0, 0]);
  fillRect(0, 0, WALL_VISIBLE_PX, 32, base);
  fillRect(0, 0, 3, 32, edge);
  for (let i = 0; i < 8; i++) set(5 + (i * 3) % 7, 3 + (i * 5) % 26, speck);
}

/** Quina externa 14×14 (canto NW no atlas; engine espelha para NE/SW/SE). */
function drawWallCorner({ fillRect }, base, edge) {
  fillRect(0, 0, 32, 32, [0, 0, 0, 0]);
  fillRect(0, 0, WALL_VISIBLE_PX, WALL_VISIBLE_PX, base);
  fillRect(0, 0, WALL_VISIBLE_PX, 3, edge);
  fillRect(0, 0, 3, WALL_VISIBLE_PX, edge);
}

/** Sombra de teto: faixa nos 22 px superiores; resto transparente. */
function drawCeilingBandTile({ fillRect }, color) {
  fillRect(0, 0, 32, 32, [0, 0, 0, 0]);
  fillRect(0, 0, 32, CEILING_VISIBLE_PX, color);
}

function atlasJson(imageName, frames, metaExtra = {}) {
  const frameEntries = {};
  const names = Object.keys(frames);
  const cols = names.length;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    frameEntries[name] = {
      frame: { x: i * 32, y: 0, w: 32, h: 32 },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: 32, h: 32 },
      sourceSize: { w: 32, h: 32 },
    };
  }
  return JSON.stringify(
    {
      frames: frameEntries,
      meta: {
        app: 'Snaredusk',
        version: '1.0',
        image: imageName,
        format: 'RGBA8888',
        size: { w: cols * 32, h: 32 },
        scale: '1',
        snaredusk: { tileSize: 32, ...metaExtra },
      },
    },
    null,
    2,
  );
}

function stitchAtlas(frameDataByName) {
  const names = Object.keys(frameDataByName);
  const w = names.length * 32;
  const out = Buffer.alloc(w * 32 * 4);
  names.forEach((name, i) => {
    const src = frameDataByName[name];
    for (let y = 0; y < 32; y++) {
      src.copy(out, (y * w + i * 32) * 4, y * 32 * 4, y * 32 * 4 + 32 * 4);
    }
  });
  return out;
}

function writeAtlas(dir, baseName, frames, metaExtra) {
  mkdirSync(dir, { recursive: true });
  const data = stitchAtlas(frames);
  writePng(join(dir, `${baseName}.png`), Object.keys(frames).length * 32, 32, data);
  writeFileSync(join(dir, `${baseName}.json`), atlasJson(`${baseName}.png`, frames, metaExtra));
}

const BIOME_TILES = {
  floresta: {
    void: ({ fillRect }) => fillRect(0, 0, 32, 32, [18, 15, 26, 255]),
    floor: ({ fillRect, set }) => {
      fillRect(0, 0, 32, 32, [42, 74, 42, 255]);
      for (let i = 0; i < 8; i++) set(4 + (i * 5) % 24, 6 + (i * 3) % 20, [61, 92, 58, 255]);
    },
    wall_h: (ctx) => drawWallHorizontal(ctx, [26, 46, 26, 255], [61, 92, 58, 255], [34, 58, 34, 255]),
    wall_v: (ctx) => drawWallVertical(ctx, [26, 46, 26, 255], [61, 92, 58, 255], [34, 58, 34, 255]),
    wall_corner: (ctx) => drawWallCorner(ctx, [26, 46, 26, 255], [61, 92, 58, 255]),
    hole: ({ fillRect, fillCircle }) => {
      fillRect(0, 0, 32, 32, [10, 8, 16, 0]);
      fillCircle(16, 18, 12, [10, 8, 16, 255]);
      fillCircle(14, 16, 4, [21, 17, 32, 200]);
    },
    ceiling_band: (ctx) => drawCeilingBandTile(ctx, [26, 46, 26, 90]),
  },
  cristal: {
    void: ({ fillRect }) => fillRect(0, 0, 32, 32, [12, 14, 28, 255]),
    floor: ({ fillRect, set }) => {
      fillRect(0, 0, 32, 32, [36, 52, 82, 255]);
      for (let i = 0; i < 6; i++) set(8 + i * 4, 10 + (i % 3) * 6, [120, 180, 240, 255]);
    },
    wall_h: (ctx) => drawWallHorizontal(ctx, [28, 38, 68, 255], [90, 140, 220, 255], [40, 55, 90, 255]),
    wall_v: (ctx) => drawWallVertical(ctx, [28, 38, 68, 255], [90, 140, 220, 255], [40, 55, 90, 255]),
    wall_corner: (ctx) => drawWallCorner(ctx, [28, 38, 68, 255], [90, 140, 220, 255]),
    hole: ({ fillCircle }) => fillCircle(16, 18, 11, [8, 10, 22, 255]),
    ceiling_band: (ctx) => drawCeilingBandTile(ctx, [20, 30, 55, 100]),
  },
  termal: {
    void: ({ fillRect }) => fillRect(0, 0, 32, 32, [22, 12, 10, 255]),
    floor: ({ fillRect, set }) => {
      fillRect(0, 0, 32, 32, [74, 48, 32, 255]);
      for (let i = 0; i < 5; i++) set(6 + i * 5, 14 + (i % 2) * 4, [180, 90, 40, 255]);
    },
    wall_h: (ctx) => drawWallHorizontal(ctx, [58, 36, 28, 255], [120, 60, 30, 255], [74, 48, 32, 255]),
    wall_v: (ctx) => drawWallVertical(ctx, [58, 36, 28, 255], [120, 60, 30, 255], [74, 48, 32, 255]),
    wall_corner: (ctx) => drawWallCorner(ctx, [58, 36, 28, 255], [120, 60, 30, 255]),
    hole: ({ fillCircle }) => fillCircle(16, 20, 10, [40, 20, 10, 255]),
    ceiling_band: (ctx) => drawCeilingBandTile(ctx, [50, 28, 20, 90]),
  },
};

const BIOME_PROPS = {
  floresta: {
    mushroom_a: ({ fillCircle, fillRect }) => {
      fillCircle(16, 12, 7, [93, 187, 99, 255]);
      fillRect(14, 12, 4, 14, [107, 154, 107, 255]);
    },
    mushroom_b: ({ fillCircle, fillRect }) => {
      fillCircle(16, 11, 5, [143, 216, 148, 255]);
      fillRect(15, 11, 2, 16, [74, 106, 74, 255]);
    },
    rock: ({ fillRect }) => {
      fillRect(8, 14, 16, 12, [74, 74, 90, 255]);
      fillRect(10, 12, 12, 6, [106, 106, 122, 255]);
    },
    chest: ({ fillRect }) => {
      fillRect(7, 14, 18, 12, [138, 106, 48, 255]);
      fillRect(7, 12, 18, 4, [196, 160, 64, 255]);
    },
    chest_epic: ({ fillRect, fillCircle }) => {
      fillRect(6, 14, 20, 13, [90, 58, 120, 255]);
      fillRect(6, 11, 20, 5, [232, 200, 104, 255]);
      fillCircle(16, 9, 3, [196, 240, 130, 255]);
    },
    chest_open: ({ fillRect }) => {
      fillRect(7, 16, 18, 10, [90, 74, 48, 255]);
      fillRect(7, 10, 18, 8, [58, 48, 32, 200]);
    },
  },
  cristal: {
    crystal_a: ({ fillRect }) => {
      fillRect(15, 6, 4, 20, [120, 200, 255, 255]);
      fillRect(10, 14, 6, 10, [90, 160, 230, 255]);
      fillRect(18, 12, 5, 12, [140, 220, 255, 255]);
    },
    crystal_b: ({ fillRect }) => {
      fillRect(14, 8, 5, 18, [180, 140, 255, 255]);
      fillRect(9, 16, 4, 8, [120, 90, 200, 255]);
    },
    rock: ({ fillRect }) => {
      fillRect(8, 16, 16, 10, [60, 70, 100, 255]);
      fillRect(10, 12, 12, 8, [100, 130, 180, 255]);
    },
    chest: ({ fillRect }) => {
      fillRect(7, 14, 18, 12, [80, 100, 140, 255]);
      fillRect(7, 12, 18, 4, [160, 200, 255, 255]);
    },
    chest_epic: ({ fillRect, fillCircle }) => {
      fillRect(6, 14, 20, 13, [60, 80, 140, 255]);
      fillRect(6, 11, 20, 5, [200, 230, 255, 255]);
      fillCircle(16, 9, 3, [255, 220, 120, 255]);
    },
    chest_open: ({ fillRect }) => {
      fillRect(7, 16, 18, 10, [50, 60, 90, 255]);
      fillRect(7, 10, 18, 8, [30, 40, 70, 200]);
    },
  },
  termal: {
    thermal_a: ({ fillCircle, fillRect }) => {
      fillCircle(16, 20, 8, [180, 80, 30, 180]);
      fillRect(14, 8, 4, 14, [90, 50, 30, 255]);
    },
    thermal_b: ({ fillRect }) => {
      fillRect(10, 18, 12, 8, [120, 50, 20, 255]);
      fillRect(12, 10, 8, 10, [200, 100, 40, 200]);
    },
    rock: ({ fillRect }) => {
      fillRect(8, 15, 16, 11, [70, 45, 35, 255]);
      fillRect(10, 12, 12, 6, [110, 70, 50, 255]);
    },
    chest: ({ fillRect }) => {
      fillRect(7, 14, 18, 12, [120, 70, 40, 255]);
      fillRect(7, 12, 18, 4, [200, 140, 60, 255]);
    },
    chest_epic: ({ fillRect, fillCircle }) => {
      fillRect(6, 14, 20, 13, [100, 50, 30, 255]);
      fillRect(6, 11, 20, 5, [255, 180, 60, 255]);
      fillCircle(16, 9, 3, [255, 120, 40, 255]);
    },
    chest_open: ({ fillRect }) => {
      fillRect(7, 16, 18, 10, [80, 40, 25, 255]);
      fillRect(7, 10, 18, 8, [50, 25, 15, 200]);
    },
  },
};

const BASE_TILES = {
  floor: ({ fillRect }) => {
    fillRect(0, 0, 32, 32, [42, 61, 42, 255]);
    fillRect(2, 2, 28, 28, [61, 92, 58, 255]);
  },
  rock: ({ fillRect }) => {
    fillRect(0, 0, 32, 32, [26, 21, 32, 255]);
    fillRect(6, 6, 20, 20, [58, 48, 72, 255]);
  },
  wall_h: (ctx) => drawWallHorizontal(ctx, [74, 58, 48, 255], [106, 86, 72, 255], [58, 48, 40, 255]),
  wall_v: (ctx) => drawWallVertical(ctx, [74, 58, 48, 255], [106, 86, 72, 255], [58, 48, 40, 255]),
  corridor: ({ fillRect, set }) => {
    fillRect(0, 0, 32, 32, [36, 52, 36, 255]);
    for (let x = 4; x < 28; x += 8) set(x, 16, [80, 120, 80, 255]);
  },
};

for (const [biomeId, tiles] of Object.entries(BIOME_TILES)) {
  const dir = join(ASSETS, 'biomes', biomeId);
  const frameData = {};
  for (const [name, draw] of Object.entries(tiles)) frameData[name] = tileFrame(draw);
  writeAtlas(dir, 'tileset', frameData, { biomeId });
  console.log(`wrote biome tileset: ${biomeId}`);

  const props = BIOME_PROPS[biomeId];
  const propData = {};
  for (const [name, draw] of Object.entries(props)) propData[name] = tileFrame(draw);
  writeAtlas(dir, 'props', propData, { biomeId, kind: 'props' });
  console.log(`wrote biome props: ${biomeId}`);
}

{
  const dir = join(ASSETS, 'base');
  const frameData = {};
  for (const [name, draw] of Object.entries(BASE_TILES)) frameData[name] = tileFrame(draw);
  writeAtlas(dir, 'tileset', frameData, { kind: 'base' });
  console.log('wrote base tileset');
}
