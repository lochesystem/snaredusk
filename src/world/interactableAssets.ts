import { Assets, Texture } from 'pixi.js';

export type InteractableKind = 'rest' | 'event' | 'merchant';

const INTERACTABLE_KINDS: InteractableKind[] = ['rest', 'event', 'merchant'];
const interactableFrames = new Map<InteractableKind, Texture[]>();
let preloadPromise: Promise<void> | null = null;

function assetUrl(kind: InteractableKind): string {
  return `${import.meta.env.BASE_URL}assets/interactables/${kind}.json`;
}

async function loadInteractable(kind: InteractableKind): Promise<void> {
  try {
    const sheet = await Assets.load({
      alias: `interactable:${kind}`,
      src: assetUrl(kind),
      data: { textureOptions: { scaleMode: 'nearest' } },
    });
    const frames = sheet.animations?.[kind] as Texture[] | undefined;
    if (!frames?.length) return;
    for (const frame of frames) frame.source.scaleMode = 'nearest';
    interactableFrames.set(kind, frames);
  } catch {
    interactableFrames.delete(kind);
  }
}

export async function preloadInteractableSprites(): Promise<void> {
  await Promise.all(INTERACTABLE_KINDS.map(loadInteractable));
}

export function ensureInteractableSpritesPreloaded(): Promise<void> {
  if (!preloadPromise) preloadPromise = preloadInteractableSprites();
  return preloadPromise;
}

export function getInteractableFrames(kind: InteractableKind): Texture[] {
  return interactableFrames.get(kind) ?? [];
}

export function resetInteractableSpriteCache(): void {
  interactableFrames.clear();
  preloadPromise = null;
}
