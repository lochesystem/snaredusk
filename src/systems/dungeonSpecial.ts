import { createBossGateKey, BOSS_GATE_KEY_IDS } from '../data/specialItems.ts';
import type { BiomeId } from '../data/biomes.ts';
import {
  createEmptySpecialBag,
  type GameState,
  type SpecialItem,
} from '../types.ts';

export interface PhaseEnemy {
  dead: boolean;
  fled: boolean;
  isBoss: boolean;
  isMinion: boolean;
}

export function isPhaseEnemy(enemy: PhaseEnemy): boolean {
  return !enemy.isBoss && !enemy.isMinion;
}

export function countRemainingPhaseEnemies(enemies: PhaseEnemy[]): number {
  return enemies.filter((e) => isPhaseEnemy(e) && !e.dead && !e.fled).length;
}

export function isPhaseCleared(enemies: PhaseEnemy[]): boolean {
  return countRemainingPhaseEnemies(enemies) === 0;
}

export function clearDungeonSpecial(state: GameState): void {
  state.dungeonSpecial = createEmptySpecialBag();
}

export function hasBossGateKey(state: GameState, biomeId: BiomeId): boolean {
  const keyId = BOSS_GATE_KEY_IDS[biomeId];
  return state.dungeonSpecial.some((s) => s?.id === keyId);
}

export function grantBossGateKey(state: GameState, biomeId: BiomeId): boolean {
  if (hasBossGateKey(state, biomeId)) return false;
  const key = createBossGateKey(biomeId);
  const idx = state.dungeonSpecial.findIndex((s) => s === null);
  if (idx < 0) return false;
  state.dungeonSpecial[idx] = key;
  return true;
}

export function formatSpecialItem(item: SpecialItem): string {
  return `${item.name} — ${item.description}`;
}
