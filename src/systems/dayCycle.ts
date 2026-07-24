import { PLAYER_MAX_HP, PLAYER_MAX_STAMINA } from '../engine/constants.ts';
import type { GameState } from '../types.ts';
import {
  aggregateYieldResults,
  collectHabitatProduction,
  type HabitatProductionResult,
  type HabitatYieldResult,
} from './habitatProduction.ts';

export interface DayEndResult {
  newDay: number;
  collected: HabitatYieldResult[];
  overflow: HabitatYieldResult[];
}

export function canEnterDungeonToday(state: GameState): boolean {
  return !state.dungeonUsedToday;
}

export function canSleepToday(state: GameState): boolean {
  return state.dungeonReturnedToday;
}

/** Marca retorno da masmorra (permite dormir). */
export function markDungeonReturned(state: GameState): void {
  state.dungeonReturnedToday = true;
}

/**
 * Continue sempre reabre o jogo na base. Libera uma nova expedição sem
 * avançar o calendário nem processar a produção diária.
 */
export function resumeDayAtBase(state: GameState): boolean {
  if (!state.dungeonUsedToday && !state.dungeonReturnedToday) return false;
  state.dungeonUsedToday = false;
  state.dungeonReturnedToday = false;
  return true;
}

export function endDay(state: GameState): DayEndResult {
  const production = collectHabitatProduction(state);
  state.dayNumber += 1;
  state.shopDayUsed = false;
  state.dungeonUsedToday = false;
  state.dungeonReturnedToday = false;
  state.playerHp = PLAYER_MAX_HP;
  state.playerStamina = PLAYER_MAX_STAMINA;
  return {
    newDay: state.dayNumber,
    collected: production.collected,
    overflow: production.overflow,
  };
}

export function formatDayEndMessage(result: DayEndResult): string {
  const parts: string[] = [];

  if (result.collected.length === 0) {
    parts.push('Nada produzido no habitat');
  } else {
    const summary = aggregateYieldResults(result.collected)
      .map((y) => `+${y.quantity} ${y.lootName}`)
      .join(', ');
    parts.push(`Habitat: ${summary}`);
  }

  if (result.overflow.length > 0) {
    const lost = aggregateYieldResults(result.overflow)
      .map((y) => `+${y.quantity} ${y.lootName}`)
      .join(', ');
    parts.push(`Bolsa cheia — perdeu ${lost}`);
  }

  return `Dia ${result.newDay} — ${parts.join(' · ')}`;
}

export function summarizeProduction(production: HabitatProductionResult): string {
  return formatDayEndMessage({
    newDay: 0,
    collected: production.collected,
    overflow: production.overflow,
  }).replace(/^Dia 0 — /, '');
}
