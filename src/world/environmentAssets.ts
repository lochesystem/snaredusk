import { Assets, Rectangle, Texture } from 'pixi.js';
import type { BiomeId } from '../data/biomes.ts';

export const ENV_TILE_SIZE = 32;

/** Espessura visível / colisão das paredes (faixa dentro do frame 32×32). */
export const WALL_TILE_VISIBLE_PX = 14;

/** Recorte fixo por frame — região do PNG, igual para todas as paredes do bioma. */
export const WALL_STRIP_CROPS = {
  wall_h: { x: 0, y: 0, w: ENV_TILE_SIZE, h: WALL_TILE_VISIBLE_PX },
  wall_v: { x: 0, y: 0, w: WALL_TILE_VISIBLE_PX, h: ENV_TILE_SIZE },
  wall_corner: { x: 0, y: 0, w: WALL_TILE_VISIBLE_PX, h: WALL_TILE_VISIBLE_PX },
} as const;

/** Espessura de colisão/render das paredes — use os 14 px superiores (H) ou esquerdos (V) do frame `wall`. */

/** Altura visível do frame `ceiling_band` — use os 22 px superiores do tile. */
export const CEILING_BAND_VISIBLE_PX = 22;

export type TileFrameMap = Map<string, Texture>;

const biomeTilesets = new Map<BiomeId, TileFrameMap>();
const biomeProps = new Map<BiomeId, TileFrameMap>();
const missingBiomeTilesets = new Set<BiomeId>();
const missingBiomeProps = new Set<BiomeId>();

let baseTileset: TileFrameMap | null = null;
let baseStations: TileFrameMap | null = null;
let baseTilesetMissing = false;
let baseStationsMissing = false;
let basePreloadPromise: Promise<void> | null = null;
const biomePreloadPromises = new Map<BiomeId, Promise<void>>();
const wallStripCache = new Map<string, Texture>();

function wallStripCacheKey(biomeId: BiomeId, kind: 'h' | 'v' | 'corner'): string {
  return `${biomeId}:${kind}`;
}

function cropStrip(
  source: Texture,
  localX: number,
  localY: number,
  w: number,
  h: number,
  key: string,
): Texture {
  const cached = wallStripCache.get(key);
  if (cached) return cached;
  const frame = source.frame;
  const strip = new Texture({
    source: source.source,
    frame: new Rectangle(frame.x + localX, frame.y + localY, w, h),
  });
  wallStripCache.set(key, strip);
  return strip;
}

function assetBase(): string {
  return `${import.meta.env.BASE_URL}assets`;
}

function biomeTilesetUrl(biomeId: BiomeId): string {
  const atlas = biomeId === 'floresta' ? 'tileset-v3' : 'tileset';
  return `${assetBase()}/biomes/${biomeId}/${atlas}.json`;
}

function biomePropsUrl(biomeId: BiomeId): string {
  const atlas = biomeId === 'floresta' ? 'props-v2' : 'props';
  return `${assetBase()}/biomes/${biomeId}/${atlas}.json`;
}

function baseTilesetUrl(): string {
  return `${assetBase()}/base/tileset.json`;
}

function baseStationsUrl(): string {
  return `${assetBase()}/base/stations-v2.json`;
}

function texturesFromSheet(
  sheet: { textures?: Record<string, Texture> },
  scaleMode?: 'nearest' | 'linear',
): TileFrameMap {
  const map: TileFrameMap = new Map();
  if (!sheet.textures) return map;
  for (const [name, texture] of Object.entries(sheet.textures)) {
    if (scaleMode) texture.source.scaleMode = scaleMode;
    map.set(name, texture);
  }
  return map;
}

async function loadAtlas(
  jsonUrl: string,
  alias: string,
  scaleMode?: 'nearest' | 'linear',
): Promise<TileFrameMap | null> {
  try {
    const sheet = await Assets.load({
      alias,
      src: jsonUrl,
      data: scaleMode ? { textureOptions: { scaleMode } } : undefined,
    });
    const textures = texturesFromSheet(sheet, scaleMode);
    return textures.size > 0 ? textures : null;
  } catch {
    return null;
  }
}

async function loadBiomeTilesetInternal(biomeId: BiomeId): Promise<void> {
  if (biomeTilesets.has(biomeId) || missingBiomeTilesets.has(biomeId)) return;
  const textures = await loadAtlas(biomeTilesetUrl(biomeId), `biome-tileset:${biomeId}`, 'nearest');
  if (textures) {
    biomeTilesets.set(biomeId, textures);
  } else {
    missingBiomeTilesets.add(biomeId);
  }
}

async function loadBiomePropsInternal(biomeId: BiomeId): Promise<void> {
  if (biomeProps.has(biomeId) || missingBiomeProps.has(biomeId)) return;
  const textures = await loadAtlas(biomePropsUrl(biomeId), `biome-props:${biomeId}`, 'nearest');
  if (textures) {
    biomeProps.set(biomeId, textures);
  } else {
    missingBiomeProps.add(biomeId);
  }
}

async function loadBaseTilesetInternal(): Promise<void> {
  if (baseTileset || baseTilesetMissing) return;
  const textures = await loadAtlas(baseTilesetUrl(), 'base-tileset');
  if (textures) {
    baseTileset = textures;
  } else {
    baseTilesetMissing = true;
  }
}

async function loadBaseStationsInternal(): Promise<void> {
  if (baseStations || baseStationsMissing) return;
  const textures = await loadAtlas(baseStationsUrl(), 'base-stations-v2', 'nearest');
  if (textures) {
    baseStations = textures;
  } else {
    baseStationsMissing = true;
  }
}

export function ensureEnvironmentPreloaded(biomeId: BiomeId): Promise<void> {
  let promise = biomePreloadPromises.get(biomeId);
  if (!promise) {
    promise = Promise.all([
      loadBiomeTilesetInternal(biomeId),
      loadBiomePropsInternal(biomeId),
    ]).then(() => undefined);
    biomePreloadPromises.set(biomeId, promise);
  }
  return promise;
}

export function ensureBaseTilesetPreloaded(): Promise<void> {
  if (!basePreloadPromise) {
    basePreloadPromise = Promise.all([
      loadBaseTilesetInternal(),
      loadBaseStationsInternal(),
    ]).then(() => undefined);
  }
  return basePreloadPromise;
}

export function hasBiomeTileset(biomeId: BiomeId): boolean {
  return biomeTilesets.has(biomeId);
}

export function hasBiomeProps(biomeId: BiomeId): boolean {
  return biomeProps.has(biomeId);
}

export function hasBaseTileset(): boolean {
  return baseTileset !== null;
}

export function getBiomeTileTexture(biomeId: BiomeId, frame: string): Texture | null {
  return biomeTilesets.get(biomeId)?.get(frame) ?? null;
}

export function getBiomePropTexture(biomeId: BiomeId, frame: string): Texture | null {
  return biomeProps.get(biomeId)?.get(frame) ?? null;
}

export function getBaseTileTexture(frame: string): Texture | null {
  return baseTileset?.get(frame) ?? null;
}

export function getBaseStationTexture(frame: string): Texture | null {
  return baseStations?.get(frame) ?? null;
}

/** Faixa horizontal 32×14 para paredes N/S. */
export function getWallHorizontalTexture(biomeId: BiomeId): Texture | null {
  const crop = WALL_STRIP_CROPS.wall_h;
  const direct = getBiomeTileTexture(biomeId, 'wall_h');
  if (direct) {
    return cropStrip(direct, crop.x, crop.y, crop.w, crop.h, wallStripCacheKey(biomeId, 'h'));
  }
  const legacy = getBiomeTileTexture(biomeId, 'wall');
  if (!legacy) return null;
  return cropStrip(legacy, crop.x, crop.y, crop.w, crop.h, wallStripCacheKey(biomeId, 'h'));
}

/** Faixa vertical 14×32 para paredes L/O. */
export function getWallVerticalTexture(biomeId: BiomeId): Texture | null {
  const crop = WALL_STRIP_CROPS.wall_v;
  const direct = getBiomeTileTexture(biomeId, 'wall_v');
  if (direct) {
    return cropStrip(direct, crop.x, crop.y, crop.w, crop.h, wallStripCacheKey(biomeId, 'v'));
  }
  const legacy = getBiomeTileTexture(biomeId, 'wall');
  if (!legacy) return null;
  return cropStrip(legacy, crop.x, crop.y, crop.w, crop.h, wallStripCacheKey(biomeId, 'v'));
}

/** Quina externa 14×14 (NW no atlas; renderer espelha). */
export function getWallCornerTexture(biomeId: BiomeId): Texture | null {
  const crop = WALL_STRIP_CROPS.wall_corner;
  const direct = getBiomeTileTexture(biomeId, 'wall_corner');
  if (direct) {
    return cropStrip(direct, crop.x, crop.y, crop.w, crop.h, wallStripCacheKey(biomeId, 'corner'));
  }
  const legacy = getBiomeTileTexture(biomeId, 'wall');
  if (!legacy) return null;
  return cropStrip(legacy, crop.x, crop.y, crop.w, crop.h, wallStripCacheKey(biomeId, 'corner'));
}

export function decorPropFrameName(kind: string, variant: number): string {
  const suffix = variant % 2 === 0 ? 'a' : 'b';
  if (kind === 'crystal') return `crystal_${suffix}`;
  if (kind === 'thermal') return `thermal_${suffix}`;
  return `mushroom_${suffix}`;
}

export function chestPropFrameName(opened: boolean, epic: boolean): string {
  if (opened) return 'chest_open';
  if (epic) return 'chest_epic';
  return 'chest';
}

export function resetEnvironmentCache(): void {
  biomeTilesets.clear();
  biomeProps.clear();
  missingBiomeTilesets.clear();
  missingBiomeProps.clear();
  baseTileset = null;
  baseStations = null;
  baseTilesetMissing = false;
  baseStationsMissing = false;
  basePreloadPromise = null;
  biomePreloadPromises.clear();
  wallStripCache.clear();
}
