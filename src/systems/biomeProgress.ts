import type { BiomeId } from '../data/biomes.ts';
import { BIOMES, listBiomes } from '../data/biomes.ts';
import { LOOT_TABLE } from '../data/items.ts';
import type { GameState, LootItem } from '../types.ts';
import { addToBag } from './saveManager.ts';

export function isBiomeUnlocked(state: GameState, biomeId: BiomeId): boolean {
  return state.unlockedBiomes.includes(biomeId);
}

export function unlockBiome(state: GameState, biomeId: BiomeId): void {
  if (!state.unlockedBiomes.includes(biomeId)) {
    state.unlockedBiomes.push(biomeId);
  }
}

/** Chefe do bioma anterior derrotado? */
export function canUnlockBiome(state: GameState, biomeId: BiomeId): boolean {
  const def = BIOMES[biomeId];
  if (!def.unlockAfterBossIn) return true;
  return state.biomeBossDefeated[def.unlockAfterBossIn] === true;
}

export function syncBiomeUnlocks(state: GameState): void {
  if (!state.unlockedBiomes.includes('floresta')) {
    state.unlockedBiomes = ['floresta', ...state.unlockedBiomes.filter((b) => b !== 'floresta')];
  }
  if (state.dungeonCleared) {
    state.biomeBossDefeated.floresta = true;
  }
  for (const biome of listBiomes()) {
    if (canUnlockBiome(state, biome.id)) {
      unlockBiome(state, biome.id);
    }
  }
  if (state.activeBiome && !isBiomeUnlocked(state, state.activeBiome)) {
    state.activeBiome = 'floresta';
  }
}

export function onBiomeBossDefeated(state: GameState, biomeId: BiomeId): void {
  state.biomeBossDefeated[biomeId] = true;
  if (biomeId === 'floresta') {
    state.dungeonCleared = true;
    grantSporeKey(state);
  }
  syncBiomeUnlocks(state);
}

function grantSporeKey(state: GameState): void {
  if (state.hasSporeKey) return;
  const def = LOOT_TABLE.chave_esporo;
  if (!def) return;
  const key: LootItem = {
    kind: 'loot',
    id: def.id,
    name: def.name,
    baseValue: def.baseValue,
    quantity: 1,
  };
  if (addToBag(state, key)) {
    state.hasSporeKey = true;
  } else {
    state.hasSporeKey = true;
  }
}

export function selectBiome(state: GameState, biomeId: BiomeId): boolean {
  if (!isBiomeUnlocked(state, biomeId)) return false;
  state.activeBiome = biomeId;
  return true;
}
