import { Container, Graphics, Sprite, TilingSprite } from 'pixi.js';
import type { BiomeId, BiomeTheme } from '../data/biomes.ts';
import type { DungeonDecor, DungeonLayout, DungeonObstacle, DungeonWall, WallFacing } from './dungeonGenerator.ts';
import { WALL_THICKNESS } from './dungeonGenerator.ts';
import type { BaseCellKind } from './baseGrid.ts';
import { BaseCellKind as CellKind } from './baseGrid.ts';
import { BASE_CELL_SIZE } from '../engine/constants.ts';
import {
  chestPropFrameName,
  decorPropFrameName,
  ENV_TILE_SIZE,
  CEILING_BAND_VISIBLE_PX,
  getBaseTileTexture,
  getBiomePropTexture,
  getBiomeTileTexture,
  getWallCornerTexture,
  getWallHorizontalTexture,
  getWallVerticalTexture,
  hasBaseTileset,
  hasBiomeProps,
  hasBiomeTileset,
} from './environmentAssets.ts';
import { drawDungeonLayoutVector } from './placeholderArt.ts';

export interface DungeonLayoutDrawInput {
  floors: { x: number; y: number; width: number; height: number }[];
  walls: DungeonWall[];
  rooms: { rect: { x: number; y: number; width: number; height: number }; type?: string }[];
  decor: DungeonDecor[];
  obstacles: DungeonObstacle[];
  hazards?: { kind: string; x: number; y: number; radius: number }[];
  width: number;
  height: number;
  theme?: BiomeTheme;
}

function addTiledRect(
  parent: Container,
  texture: import('pixi.js').Texture,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const tile = new TilingSprite({ texture, width, height });
  tile.x = x;
  tile.y = y;
  tile.roundPixels = true;
  parent.addChild(tile);
}

/** Infere orientação quando metadados ausentes (ex.: layouts legados). */
export function resolveWallOrientation(wall: {
  width: number;
  height: number;
  axis?: 'h' | 'v';
  facing?: WallFacing;
}): { axis: 'h' | 'v'; facing: WallFacing } {
  if (wall.axis && wall.facing) return { axis: wall.axis, facing: wall.facing };
  if (wall.width > wall.height) {
    return { axis: 'h', facing: wall.facing ?? 'n' };
  }
  if (wall.height > wall.width) {
    return { axis: 'v', facing: wall.facing ?? 'w' };
  }
  return { axis: wall.axis ?? 'h', facing: wall.facing ?? 'n' };
}

function tileMod(n: number, size: number): number {
  return ((n % size) + size) % size;
}

function cornerKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Cantos externos de salas — chave `${x},${y}` no canto superior-esquerdo do bloco 14×14. */
export function collectRoomCornerKeys(
  rooms: { rect: { x: number; y: number; width: number; height: number } }[],
): Set<string> {
  const corners = new Set<string>();
  const t = WALL_THICKNESS;
  for (const room of rooms) {
    const r = room.rect;
    corners.add(cornerKey(r.x, r.y));
    corners.add(cornerKey(r.x + r.width - t, r.y));
    corners.add(cornerKey(r.x, r.y + r.height - t));
    corners.add(cornerKey(r.x + r.width - t, r.y + r.height - t));
  }
  return corners;
}

export type WallCornerId = 'nw' | 'ne' | 'sw' | 'se';

export function cornerIdAt(
  rooms: { rect: { x: number; y: number; width: number; height: number } }[],
  x: number,
  y: number,
): WallCornerId | null {
  const t = WALL_THICKNESS;
  for (const room of rooms) {
    const r = room.rect;
    if (x === r.x && y === r.y) return 'nw';
    if (x === r.x + r.width - t && y === r.y) return 'ne';
    if (x === r.x && y === r.y + r.height - t) return 'sw';
    if (x === r.x + r.width - t && y === r.y + r.height - t) return 'se';
  }
  return null;
}

interface WallStripTextures {
  h: import('pixi.js').Texture;
  v: import('pixi.js').Texture;
  corner: import('pixi.js').Texture;
}

function addOrientedWallTile(
  parent: Container,
  strips: WallStripTextures,
  wall: DungeonWall,
): void {
  const { axis, facing } = resolveWallOrientation(wall);
  const texture = axis === 'h' ? strips.h : strips.v;
  const tile = new TilingSprite({ texture, width: wall.width, height: wall.height });
  tile.roundPixels = true;
  tile.tilePosition.set(tileMod(-wall.x, texture.width), tileMod(-wall.y, texture.height));

  tile.x = wall.x;
  tile.y = wall.y;

  if (axis === 'h' && facing === 's') {
    tile.scale.y = -1;
    tile.y = wall.y + wall.height;
  }
  if (axis === 'v' && facing === 'e') {
    tile.scale.x = -1;
    tile.x = wall.x + wall.width;
  }

  parent.addChild(tile);
}

function addWallCornerSprite(
  parent: Container,
  texture: import('pixi.js').Texture,
  x: number,
  y: number,
  corner: WallCornerId,
): void {
  const sprite = new Sprite(texture);
  sprite.width = WALL_THICKNESS;
  sprite.height = WALL_THICKNESS;
  sprite.roundPixels = true;
  sprite.x = x;
  sprite.y = y;

  if (corner === 'ne' || corner === 'se') {
    sprite.scale.x = -1;
    sprite.x += WALL_THICKNESS;
  }
  if (corner === 'sw' || corner === 'se') {
    sprite.scale.y = -1;
    sprite.y += WALL_THICKNESS;
  }

  parent.addChild(sprite);
}

function renderDungeonWalls(
  parent: Container,
  walls: DungeonWall[],
  rooms: DungeonLayoutDrawInput['rooms'],
  strips: WallStripTextures,
): void {
  for (const wall of walls) {
    addOrientedWallTile(parent, strips, wall);
  }

  const corners = collectRoomCornerKeys(rooms);
  for (const key of corners) {
    const [cx, cy] = key.split(',').map(Number);
    const id = cornerIdAt(rooms, cx, cy);
    if (id) addWallCornerSprite(parent, strips.corner, cx, cy, id);
  }
}

function addStretchedSprite(
  parent: Container,
  texture: import('pixi.js').Texture,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const sprite = new Sprite(texture);
  sprite.x = x;
  sprite.y = y;
  sprite.width = width;
  sprite.height = height;
  sprite.roundPixels = true;
  parent.addChild(sprite);
}

function drawVectorOverlays(
  g: Graphics,
  layout: DungeonLayoutDrawInput,
): void {
  drawDungeonLayoutVector(g, {
    floors: [],
    walls: [],
    rooms: [],
    decor: [],
    obstacles: layout.obstacles.filter((o) => o.kind === 'hole'),
    chests: [],
    hazards: layout.hazards,
    width: layout.width,
    height: layout.height,
    theme: layout.theme,
    skipBaseLayers: true,
  });
}

export function buildDungeonFloorLayer(
  layout: DungeonLayoutDrawInput,
  biomeId: BiomeId,
): Container {
  const root = new Container();
  const theme = layout.theme;

  if (!hasBiomeTileset(biomeId) || !theme) {
    const gfx = new Graphics();
    drawDungeonLayoutVector(gfx, { ...layout, decor: [], obstacles: [], chests: [] });
    root.addChild(gfx);
    const overlay = new Graphics();
    drawVectorOverlays(overlay, layout);
    root.addChild(overlay);
    return root;
  }

  const voidTex = getBiomeTileTexture(biomeId, 'void');
  const floorTex = getBiomeTileTexture(biomeId, 'floor');
  const wallH = getWallHorizontalTexture(biomeId);
  const wallV = getWallVerticalTexture(biomeId);
  const wallCorner = getWallCornerTexture(biomeId);
  const legacyWall = getBiomeTileTexture(biomeId, 'wall');
  const holeTex = getBiomeTileTexture(biomeId, 'hole');
  const ceilingTex = getBiomeTileTexture(biomeId, 'ceiling_band');

  if (voidTex) {
    addTiledRect(root, voidTex, 0, 0, layout.width, layout.height);
  } else {
    const bg = new Graphics();
    bg.rect(0, 0, layout.width, layout.height);
    bg.fill(theme.void);
    root.addChild(bg);
  }

  if (floorTex) {
    for (const floor of layout.floors) {
      addTiledRect(root, floorTex, floor.x, floor.y, floor.width, floor.height);
    }
  }

  for (const room of layout.rooms) {
    const r = room.rect;
    const tint = roomTypeTint(room.type);
    const overlay = new Graphics();
    overlay.rect(r.x + 6, r.y + 6, r.width - 12, r.height - 12);
    overlay.fill({ color: tint, alpha: 0.22 });
    root.addChild(overlay);
  }

  for (const obs of layout.obstacles) {
    if (obs.kind !== 'hole') continue;
    if (holeTex) {
      const size = obs.radius * 2.2;
      addStretchedSprite(root, holeTex, obs.x - size / 2, obs.y - size / 2, size, size);
    }
  }

  if (wallH && wallV && wallCorner) {
    renderDungeonWalls(root, layout.walls, layout.rooms, {
      h: wallH,
      v: wallV,
      corner: wallCorner,
    });
  } else if (legacyWall) {
    for (const wall of layout.walls) {
      addTiledRect(root, legacyWall, wall.x, wall.y, wall.width, wall.height);
    }
  }

  for (const room of layout.rooms) {
    const r = room.rect;
    if (ceilingTex) {
      addTiledRect(root, ceilingTex, r.x + 4, r.y + 4, r.width - 8, CEILING_BAND_VISIBLE_PX);
    } else {
      const band = new Graphics();
      band.rect(r.x + 4, r.y + 4, r.width - 8, CEILING_BAND_VISIBLE_PX);
      band.fill({ color: theme.roomCeiling, alpha: 0.35 });
      root.addChild(band);
    }
  }

  const hazardGfx = new Graphics();
  drawDungeonLayoutVector(hazardGfx, {
    floors: [],
    walls: [],
    rooms: [],
    decor: [],
    obstacles: [],
    chests: [],
    hazards: layout.hazards,
    width: layout.width,
    height: layout.height,
    theme: layout.theme,
    skipBaseLayers: true,
  });
  root.addChild(hazardGfx);

  return root;
}

function roomTypeTint(type?: string): number {
  switch (type) {
    case 'treasure':
      return 0xc4a040;
    case 'event':
      return 0x8a6ab8;
    case 'rest':
      return 0x5dbb63;
    case 'merchant':
      return 0x6a8ab8;
    case 'boss':
      return 0x9a4a6a;
    default:
      return 0x3d5c3a;
  }
}

export function createDecorPropSprite(
  biomeId: BiomeId,
  kind: string,
  variant: number,
  size: number,
): Sprite | null {
  const frame = decorPropFrameName(kind, variant);
  const texture = getBiomePropTexture(biomeId, frame);
  if (!texture) return null;
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 1);
  const scale = size / ENV_TILE_SIZE;
  sprite.scale.set(scale);
  sprite.roundPixels = true;
  (sprite as Sprite & { zOffset?: number }).zOffset = 0.35;
  return sprite;
}

export function createRockPropSprite(biomeId: BiomeId, radius: number): Sprite | null {
  const texture = getBiomePropTexture(biomeId, 'rock');
  if (!texture) return null;
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.85);
  const scale = (radius * 2) / ENV_TILE_SIZE;
  sprite.scale.set(scale);
  sprite.roundPixels = true;
  (sprite as Sprite & { zOffset?: number }).zOffset = 0.4;
  return sprite;
}

export function createChestPropSprite(
  biomeId: BiomeId,
  opened: boolean,
  epic: boolean,
): Sprite | null {
  const frame = chestPropFrameName(opened, epic);
  const texture = getBiomePropTexture(biomeId, frame);
  if (!texture) return null;
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.85);
  sprite.roundPixels = true;
  (sprite as Sprite & { zOffset?: number }).zOffset = 0.5;
  return sprite;
}

export function spawnDungeonPropSprites(
  layout: Pick<DungeonLayout, 'decor' | 'obstacles'>,
  biomeId: BiomeId,
): Container[] {
  const props: Container[] = [];

  if (!hasBiomeProps(biomeId)) return props;

  for (const d of layout.decor) {
    const sprite = createDecorPropSprite(biomeId, d.kind, d.variant, d.size);
    if (!sprite) continue;
    sprite.x = d.x;
    sprite.y = d.y;
    props.push(sprite);
  }

  for (const obs of layout.obstacles) {
    if (obs.kind !== 'rock') continue;
    const sprite = createRockPropSprite(biomeId, obs.radius);
    if (!sprite) continue;
    sprite.x = obs.x;
    sprite.y = obs.y;
    props.push(sprite);
  }

  return props;
}

export function baseCellTileFrame(kind: BaseCellKind): string | null {
  switch (kind) {
    case CellKind.Floor:
      return 'floor';
    case CellKind.Rock:
      return 'rock';
    case CellKind.Wall:
      return 'wall';
    default:
      return null;
  }
}

export function buildBaseTileLayer(
  width: number,
  height: number,
  cells: readonly number[],
): Container {
  const root = new Container();

  if (!hasBaseTileset()) {
    const gfx = new Graphics();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const kind = cells[y * width + x];
        if (kind === 0) continue;
        const px = x * BASE_CELL_SIZE;
        const py = y * BASE_CELL_SIZE;
        if (kind === 1) {
          gfx.rect(px, py, BASE_CELL_SIZE, BASE_CELL_SIZE);
          gfx.fill({ color: 0x2a3d2a, alpha: 0.95 });
          gfx.rect(px + 1, py + 1, BASE_CELL_SIZE - 2, BASE_CELL_SIZE - 2);
          gfx.fill({ color: 0x3d5c3a, alpha: 0.9 });
        } else if (kind === 2) {
          gfx.rect(px, py, BASE_CELL_SIZE, BASE_CELL_SIZE);
          gfx.fill({ color: 0x1a1520, alpha: 1 });
          gfx.rect(px + 4, py + 4, BASE_CELL_SIZE - 8, BASE_CELL_SIZE - 8);
          gfx.fill({ color: 0x3a3048, alpha: 1 });
        } else if (kind === 3) {
          gfx.rect(px, py, BASE_CELL_SIZE, BASE_CELL_SIZE);
          gfx.fill({ color: 0x4a3a30, alpha: 1 });
        }
      }
    }
    root.addChild(gfx);
    return root;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const kind = cells[y * width + x];
      const frame = baseCellTileFrame(kind as BaseCellKind);
      if (!frame) continue;
      const texture = getBaseTileTexture(frame);
      if (!texture) continue;
      const sprite = new Sprite(texture);
      sprite.x = x * BASE_CELL_SIZE;
      sprite.y = y * BASE_CELL_SIZE;
      sprite.roundPixels = true;
      root.addChild(sprite);
    }
  }

  return root;
}
