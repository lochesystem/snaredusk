import { Assets, Texture } from 'pixi.js';
import {
  type CreatureSpriteLayout,
  DEFAULT_SPRITE_LAYOUT,
} from './creatureAssets.ts';
import { HOOD_IDS, type HoodId } from '../data/hoods.ts';

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

const playerAnimations = new Map<HoodId, PlayerSpriteAnimations>();
const hoodIcons = new Map<HoodId, Texture>();
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

async function loadPlayerAnimationSet(hoodId: HoodId): Promise<void> {
  const isDefault = hoodId === 'cacador';
  const base = isDefault
    ? playerAssetBase()
    : `${playerAssetBase()}/skins/${hoodId}`;
  const idleFile = isDefault ? 'player-idle-v7.json' : 'player-idle.json';
  const walkFile = isDefault ? 'player-walk-v5.json' : 'player-walk.json';
  const attackFiles = isDefault
    ? [
        'player-attack-faca-enferrujada-v4.json',
        'player-attack-picareta-combate-v4.json',
        'player-attack-lanca-esporo-v5.json',
      ]
    : [
        'player-attack-faca.json',
        'player-attack-picareta.json',
        'player-attack-lanca.json',
      ];

  try {
    const idleSheet = await Assets.load({
      alias: `player:${hoodId}:idle`,
      src: `${base}/${idleFile}`,
    });
    const walkSheet = await Assets.load({
      alias: `player:${hoodId}:walk`,
      src: `${base}/${walkFile}`,
    });
    const attackSheets = await Promise.all(
      attackFiles.map((assetFile, index) =>
        Assets.load({
          alias: `player:${hoodId}:attack:${index}`,
          src: `${base}/${assetFile}`,
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
    playerAnimations.set(hoodId, { idle, walk, attacks, layout });
    if (!isDefault) {
      try {
        const icon = await Assets.load<Texture>({
          alias: `hood-icon:${hoodId}`,
          src: `${import.meta.env.BASE_URL}assets/hoods/${hoodId}.png`,
        });
        icon.source.scaleMode = 'nearest';
        hoodIcons.set(hoodId, icon);
      } catch {
        hoodIcons.set(hoodId, idle[0]);
      }
    }
  } catch {
    playerAnimations.delete(hoodId);
  }
}

export async function preloadPlayerSprites(): Promise<void> {
  await Promise.all(HOOD_IDS.map((hoodId) => loadPlayerAnimationSet(hoodId)));
}

export function ensurePlayerSpritesPreloaded(): Promise<void> {
  if (!preloadPromise) preloadPromise = preloadPlayerSprites();
  return preloadPromise;
}

export function getPlayerAnimations(hoodId: HoodId = 'cacador'): PlayerSpriteAnimations | null {
  return playerAnimations.get(hoodId) ?? playerAnimations.get('cacador') ?? null;
}

export function getHoodIconTexture(hoodId: HoodId): Texture | null {
  if (hoodId === 'cacador') return playerAnimations.get('cacador')?.idle[0] ?? null;
  return hoodIcons.get(hoodId) ?? null;
}

export function resetPlayerSpriteCache(): void {
  playerAnimations.clear();
  hoodIcons.clear();
  preloadPromise = null;
}
