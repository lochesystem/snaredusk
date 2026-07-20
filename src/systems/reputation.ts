import type { GameState } from '../types.ts';
import { getShopLevelDef } from './shopUpgrade.ts';
import { createShopShelves } from '../types.ts';

export interface ReputationLevelDef {
  level: number;
  label: string;
  goldRequired: number;
  benefit: string;
}

/** Reputação da loja — níveis 1–3 (MVP Fase 2). */
export const REPUTATION_LEVELS: ReputationLevelDef[] = [
  { level: 1, label: 'Desconhecida', goldRequired: 0, benefit: 'Clientes básicos' },
  { level: 2, label: 'Conhecida', goldRequired: 500, benefit: '+1 prateleira de exposição' },
  { level: 3, label: 'Renomada', goldRequired: 2000, benefit: 'Colecionadores visitam mais' },
];

export const MAX_REPUTATION_LEVEL = REPUTATION_LEVELS[REPUTATION_LEVELS.length - 1]!.level;

export interface ReputationProgress {
  level: number;
  label: string;
  benefit: string;
  goldSold: number;
  nextGoldRequired: number | null;
  progressToNext: number;
}

export interface ReputationLevelUp {
  level: number;
  label: string;
  benefit: string;
}

export function getReputationLevel(goldSold: number): number {
  let level = 1;
  for (const def of REPUTATION_LEVELS) {
    if (goldSold >= def.goldRequired) level = def.level;
  }
  return level;
}

export function getReputationDef(level: number): ReputationLevelDef {
  return REPUTATION_LEVELS.find((d) => d.level === level) ?? REPUTATION_LEVELS[0]!;
}

export function getReputationProgress(goldSold: number): ReputationProgress {
  const level = getReputationLevel(goldSold);
  const def = getReputationDef(level);
  const next = REPUTATION_LEVELS.find((d) => d.level === level + 1) ?? null;
  const prevGold = def.goldRequired;
  const nextGold = next?.goldRequired ?? null;
  let progressToNext = 1;
  if (nextGold !== null) {
    const span = nextGold - prevGold;
    progressToNext = span > 0 ? Math.min(1, (goldSold - prevGold) / span) : 0;
  }
  return {
    level,
    label: def.label,
    benefit: def.benefit,
    goldSold,
    nextGoldRequired: nextGold,
    progressToNext,
  };
}

export function formatReputationSummary(goldSold: number): string {
  const p = getReputationProgress(goldSold);
  if (p.nextGoldRequired === null) {
    return `Reputação ${p.level} — ${p.label} · ${p.goldSold} ouro vendido (máx.)`;
  }
  return `Reputação ${p.level} — ${p.label} · ${p.goldSold}/${p.nextGoldRequired} ouro vendido`;
}

/** Prateleiras extras por reputação (nível 2+). */
export function getReputationShelfBonus(goldSold: number): number {
  return getReputationLevel(goldSold) >= 2 ? 1 : 0;
}

export function getShopShelfCapacity(state: GameState): number {
  const def = getShopLevelDef(state.shopLevel);
  return def.shelfCount + getReputationShelfBonus(state.shopGoldSold);
}

export function syncShopShelfCapacity(state: GameState): void {
  const count = getShopShelfCapacity(state);
  const next = createShopShelves(count);
  for (let i = 0; i < Math.min(state.shopShelves.length, next.length); i++) {
    next[i] = state.shopShelves[i] ?? null;
  }
  state.shopShelves = next;
}

export function recordShopGold(state: GameState, gold: number): ReputationLevelUp | null {
  if (gold <= 0) return null;
  const prevLevel = getReputationLevel(state.shopGoldSold);
  state.shopGoldSold += gold;
  const nextLevel = getReputationLevel(state.shopGoldSold);
  if (nextLevel <= prevLevel) return null;
  syncShopShelfCapacity(state);
  const def = getReputationDef(nextLevel);
  return { level: def.level, label: def.label, benefit: def.benefit };
}
