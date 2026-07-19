import type { BiomeId } from './biomes.ts';
import { BIOMES } from './biomes.ts';

const BASE = import.meta.env.BASE_URL;

function musicPath(filename: string): string {
  return `${BASE}assets/audio/music/${filename}`;
}

export const MUSIC_CATALOG = {
  title: musicPath('title.mp3'),
  base: musicPath('base.mp3'),
  shop: musicPath('shop.mp3'),
  biome_floresta: musicPath('biome_floresta.mp3'),
  biome_cristal: musicPath('biome_cristal.mp3'),
  biome_termal: musicPath('biome_termal.mp3'),
  boss_rei_esporas: musicPath('boss_rei_esporas.mp3'),
  boss_matriarca_prismatica: musicPath('boss_matriarca_prismatica.mp3'),
  boss_salamandra_ancia: musicPath('boss_salamandra_ancia.mp3'),
} as const;

export type MusicTrackId = keyof typeof MUSIC_CATALOG;

export const ALL_MUSIC_TRACK_IDS = Object.keys(MUSIC_CATALOG) as MusicTrackId[];

export function musicForBiome(biomeId: BiomeId): MusicTrackId {
  return `biome_${biomeId}` as MusicTrackId;
}

export function musicForBoss(speciesId: string): MusicTrackId | null {
  const biome = Object.values(BIOMES).find((b) => b.bossSpeciesId === speciesId);
  if (!biome) return null;
  return `boss_${biome.bossSpeciesId}` as MusicTrackId;
}
