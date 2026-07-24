import { Assets, Texture } from 'pixi.js';
import { SPECIES } from '../data/creatures.ts';

export interface CompanionVisual {
  idle: Texture[];
  walk: Texture[];
  attack: Texture[];
}

export interface CompanionSpriteLayout {
  anchorX: number;
  anchorY: number;
  shadowY: number;
  nativeFacing: 'left' | 'right';
}

const DEFAULT_LAYOUT: CompanionSpriteLayout = {
  anchorX: 0.5,
  anchorY: 1,
  shadowY: 0,
  nativeFacing: 'left',
};

const visuals = new Map<string, CompanionVisual>();
const layouts = new Map<string, CompanionSpriteLayout>();
const missing = new Set<string>();
let preloadPromise: Promise<void> | null = null;

function assetUrl(speciesId: string, extension: 'json' | 'png'): string {
  return `${import.meta.env.BASE_URL}assets/companions/${speciesId}.${extension}`;
}

async function loadCompanionVisual(speciesId: string): Promise<void> {
  if (visuals.has(speciesId) || missing.has(speciesId)) return;
  try {
    const sheet = await Assets.load({
      alias: `companion-sheet:${speciesId}`,
      src: assetUrl(speciesId, 'json'),
    });
    const idle = sheet.animations?.idle as Texture[] | undefined;
    const walk = sheet.animations?.walk as Texture[] | undefined;
    const attack = sheet.animations?.attack as Texture[] | undefined;
    if (!idle?.length || !walk?.length || !attack?.length) {
      missing.add(speciesId);
      return;
    }
    for (const texture of [...idle, ...walk, ...attack]) {
      texture.source.scaleMode = 'nearest';
    }
    visuals.set(speciesId, { idle, walk, attack });
    const custom = sheet.data?.meta?.snaredusk as Partial<CompanionSpriteLayout> | undefined;
    layouts.set(speciesId, {
      anchorX: custom?.anchorX ?? DEFAULT_LAYOUT.anchorX,
      anchorY: custom?.anchorY ?? DEFAULT_LAYOUT.anchorY,
      shadowY: custom?.shadowY ?? DEFAULT_LAYOUT.shadowY,
      nativeFacing: custom?.nativeFacing ?? DEFAULT_LAYOUT.nativeFacing,
    });
  } catch {
    missing.add(speciesId);
  }
}

export async function preloadCompanionSprites(speciesIds?: string[]): Promise<void> {
  await Promise.all((speciesIds ?? Object.keys(SPECIES)).map(loadCompanionVisual));
}

export function ensureCompanionSpritesPreloaded(): Promise<void> {
  if (!preloadPromise) preloadPromise = preloadCompanionSprites();
  return preloadPromise;
}

export function getCompanionVisual(speciesId: string): CompanionVisual | null {
  return visuals.get(speciesId) ?? null;
}

export function getCompanionSpriteLayout(speciesId: string): CompanionSpriteLayout {
  return layouts.get(speciesId) ?? DEFAULT_LAYOUT;
}

export function resetCompanionSpriteCache(): void {
  visuals.clear();
  layouts.clear();
  missing.clear();
  preloadPromise = null;
}
