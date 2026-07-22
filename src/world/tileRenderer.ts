import { Container, Graphics, Sprite, TilingSprite } from 'pixi.js';
import type { BiomeId, BiomeTheme } from '../data/biomes.ts';
import type { DungeonDecor, DungeonLayout, DungeonObstacle, DungeonWall, WallFacing } from './dungeonGenerator.ts';
import { CORRIDOR_WIDTH, WALL_THICKNESS } from './dungeonGenerator.ts';
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

import {
  cornerSpriteFlips,
  computeWallStripTilePosition,
  shouldFlipWallStrip,
  type WallCornerId,
} from './wallRendering.ts';

export type { WallCornerId };

type DoorDir = 'n' | 's' | 'e' | 'w';

export interface DungeonLayoutDrawInput {
  floors: { x: number; y: number; width: number; height: number }[];
  walls: DungeonWall[];
  rooms: {
    rect: { x: number; y: number; width: number; height: number };
    doors?: DoorDir[];
    type?: string;
  }[];
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

/** Encurta segmentos nas quinas da sala — evita sobrepor wall_h e wall_v no mesmo bloco 14×14. */
export function trimWallSegment(
  wall: DungeonWall,
  corners: Set<string>,
): DungeonWall | null {
  const t = WALL_THICKNESS;
  let { x, y, width, height } = wall;
  const { axis } = resolveWallOrientation(wall);

  if (axis === 'h') {
    if (corners.has(cornerKey(x, y))) {
      x += t;
      width -= t;
    }
    if (corners.has(cornerKey(x + width - t, y))) {
      width -= t;
    }
  } else {
    if (corners.has(cornerKey(x, y))) {
      y += t;
      height -= t;
    }
    if (corners.has(cornerKey(x, y + height - t))) {
      height -= t;
    }
  }

  if (width <= 0 || height <= 0) return null;
  return { ...wall, x, y, width, height };
}

export interface DoorJambCorner {
  x: number;
  y: number;
  corner: WallCornerId;
}

export interface CeilingBandSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Faixa de teto da parede norte, interrompida no vão de uma porta norte. */
export function ceilingBandSegments(room: {
  rect: { x: number; y: number; width: number; height: number };
  doors?: DoorDir[];
}): CeilingBandSegment[] {
  const r = room.rect;
  const inset = 4;
  const startX = r.x + inset;
  const endX = r.x + r.width - inset;
  const y = r.y + inset;

  if (!room.doors?.includes('n')) {
    return [{ x: startX, y, width: endX - startX, height: CEILING_BAND_VISIBLE_PX }];
  }

  const half = CORRIDOR_WIDTH / 2;
  const centerX = r.x + r.width / 2;
  const gapLeft = centerX - half;
  const gapRight = centerX + half;
  return [
    { x: startX, y, width: gapLeft - startX, height: CEILING_BAND_VISIBLE_PX },
    { x: gapRight, y, width: endX - gapRight, height: CEILING_BAND_VISIBLE_PX },
  ].filter((segment) => segment.width > 0);
}

/** Quinas internas nas ombreiras das portas (corredor ↔ sala). */
export function collectDoorJambCorners(
  rooms: { rect: { x: number; y: number; width: number; height: number }; doors?: DoorDir[] }[],
): DoorJambCorner[] {
  const t = WALL_THICKNESS;
  const half = CORRIDOR_WIDTH / 2;
  const jambs: DoorJambCorner[] = [];

  for (const room of rooms) {
    const r = room.rect;
    if (!room.doors?.length) continue;
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const gapL = cx - half;
    const gapR = cx + half;

    if (room.doors.includes('n')) {
      jambs.push({ x: gapL - t, y: r.y, corner: 'se' });
      jambs.push({ x: gapR, y: r.y, corner: 'sw' });
    }
    if (room.doors.includes('s')) {
      jambs.push({ x: gapL - t, y: r.y + r.height - t, corner: 'ne' });
      jambs.push({ x: gapR, y: r.y + r.height - t, corner: 'nw' });
    }
    if (room.doors.includes('w')) {
      jambs.push({ x: r.x, y: cy - half - t, corner: 'se' });
      jambs.push({ x: r.x, y: cy + half, corner: 'ne' });
    }
    if (room.doors.includes('e')) {
      jambs.push({ x: r.x + r.width - t, y: cy - half - t, corner: 'sw' });
      jambs.push({ x: r.x + r.width - t, y: cy + half, corner: 'nw' });
    }
  }

  return jambs;
}

interface WallStripTextures {
  h: import('pixi.js').Texture;
  v: import('pixi.js').Texture;
  corner: import('pixi.js').Texture;
}

function addOrientedWallStrip(
  parent: Container,
  strips: WallStripTextures,
  wall: DungeonWall,
): void {
  const { axis, facing } = resolveWallOrientation(wall);
  const texture = axis === 'h' ? strips.h : strips.v;
  const tile = new TilingSprite({ texture, width: wall.width, height: wall.height });
  tile.roundPixels = true;
  const phase = computeWallStripTilePosition(axis, wall.x, wall.y);
  tile.tilePosition.set(phase.x, phase.y);
  tile.x = wall.x;
  tile.y = wall.y;

  const { flipX, flipY } = shouldFlipWallStrip(axis, facing);
  if (flipY) {
    tile.scale.y = -1;
    tile.y = wall.y + wall.height;
  }
  if (flipX) {
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
  const { flipX, flipY } = cornerSpriteFlips(corner);
  const sprite = new Sprite(texture);
  sprite.width = WALL_THICKNESS;
  sprite.height = WALL_THICKNESS;
  sprite.roundPixels = true;
  sprite.x = flipX ? x + WALL_THICKNESS : x;
  sprite.y = flipY ? y + WALL_THICKNESS : y;
  if (flipX) sprite.scale.x = -1;
  if (flipY) sprite.scale.y = -1;
  parent.addChild(sprite);
}

function renderDungeonWalls(
  parent: Container,
  walls: DungeonWall[],
  rooms: DungeonLayoutDrawInput['rooms'],
  strips: WallStripTextures,
): void {
  const corners = collectRoomCornerKeys(rooms);
  const vertical: DungeonWall[] = [];
  const horizontal: DungeonWall[] = [];

  for (const wall of walls) {
    const trimmed = trimWallSegment(wall, corners);
    if (!trimmed) continue;
    const { axis } = resolveWallOrientation(trimmed);
    if (axis === 'v') vertical.push(trimmed);
    else horizontal.push(trimmed);
  }

  for (const wall of vertical) addOrientedWallStrip(parent, strips, wall);
  for (const wall of horizontal) addOrientedWallStrip(parent, strips, wall);

  for (const key of corners) {
    const [cx, cy] = key.split(',').map(Number);
    const id = cornerIdAt(rooms, cx, cy);
    if (id) addWallCornerSprite(parent, strips.corner, cx, cy, id);
  }

  for (const jamb of collectDoorJambCorners(rooms)) {
    addWallCornerSprite(parent, strips.corner, jamb.x, jamb.y, jamb.corner);
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
    for (const segment of ceilingBandSegments(room)) {
      if (ceilingTex) {
        addTiledRect(root, ceilingTex, segment.x, segment.y, segment.width, segment.height);
      } else {
        const band = new Graphics();
        band.rect(segment.x, segment.y, segment.width, segment.height);
        band.fill({ color: theme.roomCeiling, alpha: 0.35 });
        root.addChild(band);
      }
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

/** Pé da pedra alinhado ao fallback vetorial (roundRect em placeholderArt). */
export function rockPropFootY(obsY: number, radius: number): number {
  return obsY + radius * 0.8;
}

export function createRockPropSprite(biomeId: BiomeId, _radius: number): Sprite | null {
  const texture = getBiomePropTexture(biomeId, 'rock');
  if (!texture) return null;
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 1);
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
    sprite.y = rockPropFootY(obs.y, obs.radius);
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

export function baseCellTileFrameAt(kind: BaseCellKind, x: number, y: number): string | null {
  const base = baseCellTileFrame(kind);
  if (base !== 'floor' && base !== 'rock') return base;
  const variant = Math.abs((x * 73856093) ^ (y * 19349663)) % 3;
  if (variant === 1) return `${base}_b`;
  if (variant === 2) return `${base}_c`;
  return base;
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
      const frame = baseCellTileFrameAt(kind as BaseCellKind, x, y);
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
