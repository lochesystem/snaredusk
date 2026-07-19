import { describe, expect, it } from 'vitest';
import { musicForBiome, musicForBoss } from '../src/data/musicCatalog.ts';

describe('musicCatalog', () => {
  it('maps biomes to music tracks', () => {
    expect(musicForBiome('floresta')).toBe('biome_floresta');
    expect(musicForBiome('cristal')).toBe('biome_cristal');
    expect(musicForBiome('termal')).toBe('biome_termal');
  });

  it('maps boss species to music tracks', () => {
    expect(musicForBoss('rei_esporas')).toBe('boss_rei_esporas');
    expect(musicForBoss('matriarca_prismatica')).toBe('boss_matriarca_prismatica');
    expect(musicForBoss('salamandra_ancia')).toBe('boss_salamandra_ancia');
    expect(musicForBoss('unknown')).toBeNull();
  });
});
