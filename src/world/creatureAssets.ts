import { Assets, Texture } from 'pixi.js';
import { SPECIES } from '../data/creatures.ts';

/** 12 FPS no art bible → multiplicador no ticker do Pixi (~60 Hz). */
export const CREATURE_ANIM_FPS = 12;
export const CREATURE_ANIM_SPEED = CREATURE_ANIM_FPS / 60;

export type CreatureVisual =
  | { kind: 'static'; texture: Texture }
  | { kind: 'animated'; idle: Texture[]; walk?: Texture[] };

/** Ponto dos pés e sombra — pode vir do `meta.snaredusk` do atlas. */
export interface CreatureSpriteLayout {
  anchorX: number;
  anchorY: number;
  shadowY: number;
}

export const DEFAULT_SPRITE_LAYOUT: CreatureSpriteLayout = {
  anchorX: 0.5,
  anchorY: 1,
  shadowY: 0,
};

const creatureVisuals = new Map<string, CreatureVisual>();
const creatureLayouts = new Map<string, CreatureSpriteLayout>();
const missingSprites = new Set<string>();
let preloadPromise: Promise<void> | null = null;

function creatureAssetBase(): string {
  return `${import.meta.env.BASE_URL}assets/creatures`;
}

function creatureSpriteUrl(speciesId: string): string {
  return `${creatureAssetBase()}/${speciesId}.png`;
}

function creatureSheetUrl(speciesId: string): string {
  return `${creatureAssetBase()}/${speciesId}.json`;
}

function parseSpriteLayout(sheet: {
  data?: { meta?: { snaredusk?: Partial<CreatureSpriteLayout> } };
}): CreatureSpriteLayout {
  const custom = sheet.data?.meta?.snaredusk;
  if (!custom) return DEFAULT_SPRITE_LAYOUT;
  return {
    anchorX: custom.anchorX ?? DEFAULT_SPRITE_LAYOUT.anchorX,
    anchorY: custom.anchorY ?? DEFAULT_SPRITE_LAYOUT.anchorY,
    shadowY: custom.shadowY ?? DEFAULT_SPRITE_LAYOUT.shadowY,
  };
}

async function loadCreatureVisual(id: string): Promise<void> {
  if (creatureVisuals.has(id) || missingSprites.has(id)) return;

  const sheetAlias = `creature-sheet:${id}`;
  try {
    const sheet = await Assets.load({ alias: sheetAlias, src: creatureSheetUrl(id) });
    const idle = sheet.animations?.idle as Texture[] | undefined;
    const walk = sheet.animations?.walk as Texture[] | undefined;
    if (idle && idle.length > 0) {
      creatureVisuals.set(id, {
        kind: 'animated',
        idle,
        walk: walk?.length ? walk : undefined,
      });
      creatureLayouts.set(id, parseSpriteLayout(sheet));
      return;
    }
  } catch {
    // sem atlas — tenta PNG estático
  }

  const pngAlias = `creature:${id}`;
  try {
    const texture = await Assets.load({ alias: pngAlias, src: creatureSpriteUrl(id) });
    creatureVisuals.set(id, { kind: 'static', texture });
    creatureLayouts.set(id, DEFAULT_SPRITE_LAYOUT);
  } catch {
    missingSprites.add(id);
  }
}

/** Carrega PNG ou spritesheet (`{id}.json` + `{id}.png`) de `public/assets/creatures/`. */
export async function preloadCreatureSprites(speciesIds?: string[]): Promise<void> {
  const ids = speciesIds ?? Object.keys(SPECIES);
  await Promise.all(ids.map((id) => loadCreatureVisual(id)));
}

export function ensureCreatureSpritesPreloaded(): Promise<void> {
  if (!preloadPromise) preloadPromise = preloadCreatureSprites();
  return preloadPromise;
}

export function getCreatureVisual(speciesId: string): CreatureVisual | null {
  return creatureVisuals.get(speciesId) ?? null;
}

export function getCreatureSpriteLayout(speciesId: string): CreatureSpriteLayout {
  return creatureLayouts.get(speciesId) ?? DEFAULT_SPRITE_LAYOUT;
}

/** @deprecated Use getCreatureVisual — mantido para compatibilidade. */
export function getCreatureTexture(speciesId: string): Texture | null {
  const visual = creatureVisuals.get(speciesId);
  if (!visual) return null;
  if (visual.kind === 'static') return visual.texture;
  return visual.idle[0] ?? null;
}

export function hasCreatureSprite(speciesId: string): boolean {
  return creatureVisuals.has(speciesId);
}

/** Para testes — limpa cache entre casos. */
export function resetCreatureSpriteCache(): void {
  creatureVisuals.clear();
  creatureLayouts.clear();
  missingSprites.clear();
  preloadPromise = null;
}
