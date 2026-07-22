import { Assets, Texture } from 'pixi.js';

type ShopTextureMap = Map<string, Texture>;

let tiles: ShopTextureMap | null = null;
let props: ShopTextureMap | null = null;
let preloadPromise: Promise<void> | null = null;

function assetUrl(name: 'tileset-v1' | 'props-v1'): string {
  return `${import.meta.env.BASE_URL}assets/shop/${name}.json`;
}

function texturesFromSheet(sheet: { textures?: Record<string, Texture> }): ShopTextureMap {
  const result = new Map<string, Texture>();
  for (const [name, texture] of Object.entries(sheet.textures ?? {})) {
    texture.source.scaleMode = 'nearest';
    result.set(name, texture);
  }
  return result;
}

async function loadShopAssets(): Promise<void> {
  const [tileSheet, propSheet] = await Promise.all([
    Assets.load({ alias: 'shop-tileset-v1', src: assetUrl('tileset-v1') }),
    Assets.load({ alias: 'shop-props-v1', src: assetUrl('props-v1') }),
  ]);
  tiles = texturesFromSheet(tileSheet);
  props = texturesFromSheet(propSheet);
}

export function ensureShopAssetsPreloaded(): Promise<void> {
  if (!preloadPromise) preloadPromise = loadShopAssets();
  return preloadPromise;
}

export function getShopTileTexture(name: string): Texture | null {
  return tiles?.get(name) ?? null;
}

export function getShopPropTexture(name: string): Texture | null {
  return props?.get(name) ?? null;
}
