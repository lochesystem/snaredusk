import { Assets, Texture } from 'pixi.js';
import type { CustomerArchetypeId } from '../systems/customers.ts';

export const CUSTOMER_WALK_ANIM_SPEED = 6 / 60;

let animations: Partial<Record<CustomerArchetypeId, Texture[]>> = {};
let preloadPromise: Promise<void> | null = null;

function atlasUrl(): string {
  return `${import.meta.env.BASE_URL}assets/customers/customers-v1.json`;
}

async function preloadCustomerSprites(): Promise<void> {
  try {
    const sheet = await Assets.load({ alias: 'customers:v1', src: atlasUrl() });
    const ids: CustomerArchetypeId[] = [
      'morador',
      'minerador',
      'colecionador',
      'crianca',
      'rico',
      'viajante',
    ];
    const loaded: Partial<Record<CustomerArchetypeId, Texture[]>> = {};
    for (const id of ids) {
      const frames = sheet.animations?.[id] as Texture[] | undefined;
      if (!frames?.length) continue;
      for (const texture of frames) texture.source.scaleMode = 'nearest';
      loaded[id] = frames;
    }
    animations = loaded;
  } catch {
    animations = {};
  }
}

export function ensureCustomerSpritesPreloaded(): Promise<void> {
  if (!preloadPromise) preloadPromise = preloadCustomerSprites();
  return preloadPromise;
}

export function getCustomerWalkFrames(id: CustomerArchetypeId): Texture[] | null {
  return animations[id] ?? null;
}

export function resetCustomerSpriteCache(): void {
  animations = {};
  preloadPromise = null;
}
