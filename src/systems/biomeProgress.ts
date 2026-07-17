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
    grantKey(state, 'chave_esporo', 'hasSporeKey');
  }
  if (biomeId === 'cristal') {
    grantKey(state, 'chave_prismatica', 'hasPrismaticKey');
  }
  syncBiomeUnlocks(state);
}

function grantKey(
  state: GameState,
  lootId: keyof typeof LOOT_TABLE,
  flag: 'hasSporeKey' | 'hasPrismaticKey',
): void {
  if (state[flag]) return;
  const def = LOOT_TABLE[lootId];
  if (!def) return;
  const key: LootItem = {
    kind: 'loot',
    id: def.id,
    name: def.name,
    baseValue: def.baseValue,
    quantity: 1,
  };
  addToBag(state, key);
  state[flag] = true;
}

export function getBiomeUnlockToast(unlockedBiomeId: BiomeId): string | null {
  switch (unlockedBiomeId) {
    case 'cristal':
      return 'Chave de Esporo — Caverna de Cristal desbloqueada!';
    case 'termal':
      return 'Chave Prismática — Pântano Termal desbloqueado!';
    default:
      return null;
  }
}

export function selectBiome(state: GameState, biomeId: BiomeId): boolean {
  if (!isBiomeUnlocked(state, biomeId)) return false;
  state.activeBiome = biomeId;
  return true;
}
