import { Assets, Texture } from 'pixi.js';
import { WEAPONS } from '../data/weapons.ts';

const weaponIcons = new Map<string, Texture>();
let preloadPromise: Promise<void> | null = null;

function weaponIconUrl(weaponId: string): string {
  return `${import.meta.env.BASE_URL}assets/weapons/${weaponId}.png`;
}

export async function preloadWeaponIcons(): Promise<void> {
  await Promise.all(Object.keys(WEAPONS).map(async (weaponId) => {
    try {
      const texture = await Assets.load<Texture>({
        alias: `weapon-icon:${weaponId}`,
        src: weaponIconUrl(weaponId),
      });
      texture.source.scaleMode = 'nearest';
      weaponIcons.set(weaponId, texture);
    } catch {
      // O fallback vetorial continua disponível para saves/assets antigos.
    }
  }));
}

export function ensureWeaponIconsPreloaded(): Promise<void> {
  if (!preloadPromise) preloadPromise = preloadWeaponIcons();
  return preloadPromise;
}

export function getWeaponIconTexture(weaponId: string): Texture | null {
  return weaponIcons.get(weaponId) ?? null;
}

export function resetWeaponIconCache(): void {
  weaponIcons.clear();
  preloadPromise = null;
}
