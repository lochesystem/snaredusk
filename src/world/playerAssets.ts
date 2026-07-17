import { Assets, Texture } from 'pixi.js';
import {
  type CreatureSpriteLayout,
  DEFAULT_SPRITE_LAYOUT,
} from './creatureAssets.ts';

/** Walk um pouco mais rápido que idle (8 frames). */
export const PLAYER_WALK_ANIM_SPEED = 16 / 60;

export interface PlayerSpriteAnimations {
  idle: Texture[];
  walk: Texture[];
  layout: CreatureSpriteLayout;
}

let playerAnimations: PlayerSpriteAnimations | null = null;
let preloadPromise: Promise<void> | null = null;

function playerAssetBase(): string {
  return `${import.meta.env.BASE_URL}assets/player`;
}

function parseLayout(sheet: {
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

export async function preloadPlayerSprites(): Promise<void> {
  try {
    const idleSheet = await Assets.load({
      alias: 'player:idle',
      src: `${playerAssetBase()}/player-idle.json`,
    });
    const walkSheet = await Assets.load({
      alias: 'player:walk',
      src: `${playerAssetBase()}/player-walk.json`,
    });
    const idle = idleSheet.animations?.idle as Texture[] | undefined;
    const walk = walkSheet.animations?.walk as Texture[] | undefined;
    if (!idle?.length || !walk?.length) return;

    const layout = parseLayout(idleSheet);
    playerAnimations = { idle, walk, layout };
  } catch {
    playerAnimations = null;
  }
}

export function ensurePlayerSpritesPreloaded(): Promise<void> {
  if (!preloadPromise) preloadPromise = preloadPlayerSprites();
  return preloadPromise;
}

export function getPlayerAnimations(): PlayerSpriteAnimations | null {
  return playerAnimations;
}

export function resetPlayerSpriteCache(): void {
  playerAnimations = null;
  preloadPromise = null;
}
