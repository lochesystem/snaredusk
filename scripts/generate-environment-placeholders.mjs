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
const VOID_FILL = [18, 15, 26, 255];

const FLORESTA_WALL = {
  base: [26, 46, 26, 255],
  edge: [93, 187, 99, 255],
  mid: [42, 74, 42, 255],
  speck: [61, 110, 61, 255],
};

/** Padrão de tijolo alinhado a cada 8 px (tile seamless em 32 px). */
function stampWallSpecks(set, axis) {
  for (let i = 0; i < 4; i++) {
    const t = i * 8;
    if (axis === 'h') {
      set(t + 2, 6, FLORESTA_WALL.speck);
      set(t + 5, 9, FLORESTA_WALL.mid);
    } else {
      set(6, t + 2, FLORESTA_WALL.speck);
      set(9, t + 5, FLORESTA_WALL.mid);
    }
  }
}

/** Parede horizontal — célula 32×32 (borda no topo + void abaixo). */
function drawWallHorizontal({ fillRect, set }, palette = FLORESTA_WALL) {
  fillRect(0, 0, 32, 32, VOID_FILL);
  fillRect(0, 0, 32, WALL_VISIBLE_PX, palette.base);
  fillRect(0, 0, 32, 2, palette.edge);
  fillRect(0, 2, 32, 1, palette.mid);
  stampWallSpecks(set, 'h');
}

/** Parede vertical — célula 32×32 (borda à esquerda + void à direita). */
function drawWallVertical({ fillRect, set }, palette = FLORESTA_WALL) {
  fillRect(0, 0, 32, 32, VOID_FILL);
  fillRect(0, 0, WALL_VISIBLE_PX, 32, palette.base);
  fillRect(0, 0, 2, 32, palette.edge);
  fillRect(2, 0, 1, 32, palette.mid);
  stampWallSpecks(set, 'v');
}

/** Quina — célula 32×32 (bloco 14×14 no canto + void no resto). */
function drawWallCorner({ fillRect, set }, palette = FLORESTA_WALL) {
  fillRect(0, 0, 32, 32, VOID_FILL);
  fillRect(0, 0, WALL_VISIBLE_PX, WALL_VISIBLE_PX, palette.base);
  fillRect(0, 0, WALL_VISIBLE_PX, 2, palette.edge);
  fillRect(0, 2, WALL_VISIBLE_PX, 1, palette.mid);
  fillRect(0, 0, 2, WALL_VISIBLE_PX, palette.edge);
  fillRect(2, 0, 1, WALL_VISIBLE_PX, palette.mid);
  for (let i = 0; i < 4; i++) {
    const t = i * 4;
    set(t + 1, 5, palette.speck);
    set(5, t + 1, palette.speck);
  }
}

/** Sombra de teto: faixa nos 22 px superiores; resto transparente. */
function drawCeilingBandTile({ fillRect }, color) {
  fillRect(0, 0, 32, 32, [0, 0, 0, 0]);
  fillRect(0, 0, 32, CEILING_VISIBLE_PX, color);
}

const WALL_META = {
  thickness: 14,
  strips: {
    wall_h: { crop: [0, 0, 32, 14], tileAlong: 'x' },
    wall_v: { crop: [0, 0, 14, 32], tileAlong: 'y' },
    wall_corner: { crop: [0, 0, 14, 14] },
  },
  flipSouth: true,
  flipEast: true,
};
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

function blitTile(dest, destW, dx, dy, src, flipX = false, flipY = false) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const sx = flipX ? 31 - x : x;
      const sy = flipY ? 31 - y : y;
      const si = (sy * 32 + sx) * 4;
      const di = ((dy + y) * destW + (dx + x)) * 4;
      const a = src[si + 3];
      if (a === 0) continue;
      dest[di] = src[si];
      dest[di + 1] = src[si + 1];
      dest[di + 2] = src[si + 2];
      dest[di + 3] = a;
    }
  }
}

/** Preview: grade 7×7 de células 32×32 (referência para pintores = alvo do renderer). */
function renderGridExampleRoom(dest, destW, ox, oy, frames) {
  const cell = 32;
  const grid = [
    ['void', 'void', 'void', 'void', 'void', 'void', 'void'],
    ['void', 'cnw', 'wh', 'wh', 'wh', 'cne', 'void'],
    ['void', 'wv', 'floor', 'floor', 'floor', 've', 'void'],
    ['void', 'wv', 'floor', 'floor', 'floor', 've', 'void'],
    ['void', 'wv', 'floor', 'floor', 'floor', 've', 'void'],
    ['void', 'csw', 'hs', 'hs', 'hs', 'cse', 'void'],
    ['void', 'void', 'void', 'void', 'void', 'void', 'void'],
  ];

  const drawCell = (kind, px, py) => {
    switch (kind) {
      case 'void':
        blitTile(dest, destW, px, py, frames.void);
        break;
      case 'floor':
        blitTile(dest, destW, px, py, frames.floor);
        break;
      case 'wh':
        blitTile(dest, destW, px, py, frames.wall_h);
        break;
      case 'hs':
        blitTile(dest, destW, px, py, frames.wall_h, false, true);
        break;
      case 'wv':
        blitTile(dest, destW, px, py, frames.wall_v);
        break;
      case 've':
        blitTile(dest, destW, px, py, frames.wall_v, true, false);
        break;
      case 'cnw':
        blitTile(dest, destW, px, py, frames.wall_corner);
        break;
      case 'cne':
        blitTile(dest, destW, px, py, frames.wall_corner, true, false);
        break;
      case 'csw':
        blitTile(dest, destW, px, py, frames.wall_corner, false, true);
        break;
      case 'cse':
        blitTile(dest, destW, px, py, frames.wall_corner, true, true);
        break;
      default:
        break;
    }
  };

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      drawCell(grid[y][x], ox + x * cell, oy + y * cell);
    }
  }
}

/** Folha de referência: atlas + mini sala montada (exemplo para pintores). */
function writeFlorestaExampleSheet(frameData) {
  const names = Object.keys(frameData);
  const gap = 6;
  const atlasW = names.length * 32 + (names.length - 1) * gap;
  const room = 7 * 32;
  const pad = 16;
  const sheetW = Math.max(atlasW, room) + pad * 2;
  const atlasY = pad;
  const roomY = atlasY + 32 + 28;
  const sheetH = roomY + room + pad;
  const sheet = Buffer.alloc(sheetW * sheetH * 4);
  const bg = makeCanvas(sheetW, sheetH);
  bg.fillRect(0, 0, sheetW, sheetH, [24, 20, 32, 255]);
  bg.data.copy(sheet);

  const labelColors = {
    void: [40, 35, 55, 255],
    floor: [50, 90, 50, 255],
    wall_h: [70, 120, 70, 255],
    wall_v: [70, 120, 70, 255],
    wall_corner: [100, 180, 100, 255],
    hole: [30, 25, 40, 255],
    ceiling_band: [45, 70, 45, 200],
  };

  names.forEach((name, i) => {
    const x = pad + i * (32 + gap);
    blitTile(sheet, sheetW, x, atlasY, frameData[name]);
    const lc = labelColors[name] ?? [120, 120, 120, 255];
    for (let lx = x; lx < x + 32; lx++) {
      for (let ly = atlasY + 34; ly < atlasY + 38; ly++) {
        const di = (ly * sheetW + lx) * 4;
        sheet[di] = lc[0];
        sheet[di + 1] = lc[1];
        sheet[di + 2] = lc[2];
        sheet[di + 3] = 255;
      }
    }
  });

  const f = frameData;
  const ox = pad + Math.floor((sheetW - pad * 2 - room) / 2);
  const oy = roomY;
  renderGridExampleRoom(sheet, sheetW, ox, oy, f);

  const outDir = join(ASSETS, 'biomes', 'floresta');
  const docDir = join(__dirname, '..', 'docs', 'examples');
  mkdirSync(docDir, { recursive: true });
  writePng(join(outDir, 'tileset-example.png'), sheetW, sheetH, sheet);
  writePng(join(docDir, 'floresta-tileset-example.png'), sheetW, sheetH, sheet);
  console.log('wrote floresta tileset example sheet');
}

const BIOME_TILES = {
  floresta: {
    void: ({ fillRect }) => fillRect(0, 0, 32, 32, [18, 15, 26, 255]),
    floor: ({ fillRect, set }) => {
      fillRect(0, 0, 32, 32, [42, 74, 42, 255]);
      for (let i = 0; i < 8; i++) set(4 + (i * 5) % 24, 6 + (i * 3) % 20, [61, 92, 58, 255]);
    },
    wall_h: (ctx) => drawWallHorizontal(ctx),
    wall_v: (ctx) => drawWallVertical(ctx),
    wall_corner: (ctx) => drawWallCorner(ctx),
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
    wall_h: (ctx) => drawWallHorizontal(ctx, { base: [28, 38, 68, 255], edge: [120, 180, 255, 255], mid: [50, 70, 110, 255], speck: [90, 140, 220, 255] }),
    wall_v: (ctx) => drawWallVertical(ctx, { base: [28, 38, 68, 255], edge: [120, 180, 255, 255], mid: [50, 70, 110, 255], speck: [90, 140, 220, 255] }),
    wall_corner: (ctx) => drawWallCorner(ctx, { base: [28, 38, 68, 255], edge: [120, 180, 255, 255], mid: [50, 70, 110, 255], speck: [90, 140, 220, 255] }),
    hole: ({ fillCircle }) => fillCircle(16, 18, 11, [8, 10, 22, 255]),
    ceiling_band: (ctx) => drawCeilingBandTile(ctx, [20, 30, 55, 100]),
  },
  termal: {
    void: ({ fillRect }) => fillRect(0, 0, 32, 32, [22, 12, 10, 255]),
    floor: ({ fillRect, set }) => {
      fillRect(0, 0, 32, 32, [74, 48, 32, 255]);
      for (let i = 0; i < 5; i++) set(6 + i * 5, 14 + (i % 2) * 4, [180, 90, 40, 255]);
    },
    wall_h: (ctx) => drawWallHorizontal(ctx, { base: [58, 36, 28, 255], edge: [220, 120, 50, 255], mid: [90, 55, 35, 255], speck: [140, 80, 40, 255] }),
    wall_v: (ctx) => drawWallVertical(ctx, { base: [58, 36, 28, 255], edge: [220, 120, 50, 255], mid: [90, 55, 35, 255], speck: [140, 80, 40, 255] }),
    wall_corner: (ctx) => drawWallCorner(ctx, { base: [58, 36, 28, 255], edge: [220, 120, 50, 255], mid: [90, 55, 35, 255], speck: [140, 80, 40, 255] }),
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
  wall_h: (ctx) => drawWallHorizontal(ctx, { base: [74, 58, 48, 255], edge: [160, 130, 100, 255], mid: [100, 80, 65, 255], speck: [120, 95, 75, 255] }),
  wall_v: (ctx) => drawWallVertical(ctx, { base: [74, 58, 48, 255], edge: [160, 130, 100, 255], mid: [100, 80, 65, 255], speck: [120, 95, 75, 255] }),
  corridor: ({ fillRect, set }) => {
    fillRect(0, 0, 32, 32, [36, 52, 36, 255]);
    for (let x = 4; x < 28; x += 8) set(x, 16, [80, 120, 80, 255]);
  },
};

for (const [biomeId, tiles] of Object.entries(BIOME_TILES)) {
  const dir = join(ASSETS, 'biomes', biomeId);
  const frameData = {};
  for (const [name, draw] of Object.entries(tiles)) frameData[name] = tileFrame(draw);
  writeAtlas(dir, 'tileset', frameData, { biomeId, walls: WALL_META });
  console.log(`wrote biome tileset: ${biomeId}`);
  if (biomeId === 'floresta') writeFlorestaExampleSheet(frameData);

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
