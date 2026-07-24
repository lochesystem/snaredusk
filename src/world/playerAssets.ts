import { Assets, Texture } from 'pixi.js';
import {
  type CreatureSpriteLayout,
  DEFAULT_SPRITE_LAYOUT,
} from './creatureAssets.ts';

/** Quatro quadros a 8 FPS: passada legível sem repetir o ciclo depressa demais. */
export const PLAYER_WALK_ANIM_SPEED = 8 / 60;

/** Respiração lenta: quatro poses completam um ciclo por segundo. */
export const PLAYER_IDLE_ANIM_SPEED = 4 / 60;

export interface PlayerSpriteAnimations {
  idle: Texture[];
  walk: Texture[];
  attacks: Record<string, Texture[]>;
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
    nativeFacing: custom.nativeFacing ?? DEFAULT_SPRITE_LAYOUT.nativeFacing,
  };
}

function useNearestNeighbor(textures: Texture[]): void {
  for (const texture of textures) texture.source.scaleMode = 'nearest';
}

export async function preloadPlayerSprites(): Promise<void> {
  try {
    const idleSheet = await Assets.load({
      alias: 'player:idle',
      src: `${playerAssetBase()}/player-idle-v7.json`,
    });
    const walkSheet = await Assets.load({
      alias: 'player:walk',
      src: `${playerAssetBase()}/player-walk-v5.json`,
    });
    const attackSheets = await Promise.all(
      ['faca-enferrujada-v4', 'picareta-combate-v4', 'lanca-esporo-v5'].map((assetId) =>
        Assets.load({
          alias: `player:attack:${assetId}`,
          src: `${playerAssetBase()}/player-attack-${assetId}.json`,
        }),
      ),
    );
    const idle = idleSheet.animations?.idle as Texture[] | undefined;
    const walk = walkSheet.animations?.walk as Texture[] | undefined;
    if (!idle?.length || !walk?.length) return;

    const layout = parseLayout(idleSheet);
    const attacks: Record<string, Texture[]> = {
      faca_enferrujada: attackSheets[0].animations?.attack ?? [],
      picareta_combate: attackSheets[1].animations?.attack ?? [],
      lanca_esporo: attackSheets[2].animations?.attack ?? [],
    };
    attacks.foice_micelio = attacks.faca_enferrujada;
    attacks.lamina_prismatica = attacks.faca_enferrujada;
    attacks.tridente_termal = attacks.lanca_esporo;
    useNearestNeighbor(idle);
    useNearestNeighbor(walk);
    for (const textures of Object.values(attacks)) useNearestNeighbor(textures);
    playerAnimations = { idle, walk, attacks, layout };
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
