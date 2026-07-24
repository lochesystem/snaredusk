import { describe, expect, it } from 'vitest';
import { BIOME_ORDER } from '../src/data/biomes.ts';
import {
  getBestiaryEntries,
  getBestiaryProgress,
  getSpeciesBiome,
  isBestiarySpeciesDiscovered,
  listBestiarySpecies,
  registerBestiarySpecies,
} from '../src/systems/bestiary.ts';
import { defaultGameState } from '../src/types.ts';

describe('bestiary', () => {
  it('organizes six species in each biome and eighteen overall', () => {
    for (const biomeId of BIOME_ORDER) {
      expect(listBestiarySpecies(biomeId)).toHaveLength(6);
    }
    expect(getBestiaryProgress(defaultGameState())).toEqual({ discovered: 0, total: 18 });
  });

  it('keeps undiscovered data hidden', () => {
    const state = defaultGameState();
    const entry = getBestiaryEntries(state, 'floresta')[0]!;
    expect(entry.discovered).toBe(false);
    expect(entry.name).toBe('???');
    expect(entry.stats).toBeNull();
    expect(entry.drop).toBeNull();
    expect(entry.production).toBeNull();
  });

  it('reveals combat, drop and habitat data after registration', () => {
    const state = defaultGameState();
    expect(registerBestiarySpecies(state, 'lumimorcego')).toBe(true);
    expect(registerBestiarySpecies(state, 'lumimorcego')).toBe(false);

    const entry = getBestiaryEntries(state, 'floresta')
      .find((candidate) => candidate.speciesId === 'lumimorcego')!;
    expect(entry.discovered).toBe(true);
    expect(entry.name).toBe('Lumimorcego');
    expect(entry.role).toBe('Ataque à distância');
    expect(entry.stats).toEqual({ hp: 40, atk: 6, def: 2, speed: 70 });
    expect(entry.drop).toBe('Esporo brilhante');
    expect(entry.production).toBe('Pó bioluminescente ×2/dia');
    expect(entry.companionAvailable).toBe(true);
  });

  it('reveals defeated bosses from legacy saves without requiring capture', () => {
    const state = defaultGameState();
    state.biomeBossDefeated.cristal = true;
    expect(isBestiarySpeciesDiscovered(state, 'matriarca_prismatica')).toBe(true);
    expect(getBestiaryProgress(state, 'cristal')).toEqual({ discovered: 1, total: 6 });
  });

  it('rejects unknown IDs and maps registered species to their biome', () => {
    const state = defaultGameState();
    expect(registerBestiarySpecies(state, 'desconhecido')).toBe(false);
    expect(getSpeciesBiome('fenix_bruma')).toBe('termal');
    expect(getSpeciesBiome('desconhecido')).toBeNull();
  });
});
