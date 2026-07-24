import { PLAYER_MAX_HP, PLAYER_MAX_STAMINA } from '../engine/constants.ts';
import type {
  ActiveExpedition,
  BagEntry,
  ExpeditionFloor,
  ExpeditionPhase,
  GameState,
} from '../types.ts';
import type { BiomeId } from '../data/biomes.ts';

export type ExpeditionEndReason = 'extract' | 'death' | 'abandon' | 'victory';

export interface ExpeditionDifficulty {
  hpMultiplier: number;
  attackMultiplier: number;
  speedMultiplier: number;
}

function cloneBag(bag: (BagEntry | null)[]): (BagEntry | null)[] {
  return bag.map((entry) => entry ? { ...entry } : null);
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error('Seed de expedição inválida');
  return Math.max(0, Math.floor(seed));
}

/** Abre uma nova run e fixa o checkpoint do primeiro andar. */
export function beginExpedition(
  state: GameState,
  biomeId: BiomeId,
  seed: number,
): ActiveExpedition {
  if (state.activeExpedition) {
    throw new Error('Já existe uma expedição ativa');
  }
  const expedition: ActiveExpedition = {
    biomeId,
    seed: normalizeSeed(seed),
    floor: 1,
    phase: 'exploring',
    perks: [],
    perkOffers: [],
    defeatedEliteSpecies: [],
    checkpointHp: state.playerHp,
    checkpointStamina: state.playerStamina,
    checkpointBag: cloneBag(state.bag),
  };
  state.activeExpedition = expedition;
  return expedition;
}

/** Restaura somente os dados mutáveis definidos no checkpoint de entrada do andar. */
export function restoreExpeditionCheckpoint(state: GameState): ActiveExpedition | null {
  const expedition = state.activeExpedition;
  if (!expedition) return null;
  state.activeBiome = expedition.biomeId;
  state.playerHp = expedition.checkpointHp;
  state.playerStamina = expedition.checkpointStamina;
  state.bag = cloneBag(expedition.checkpointBag);
  return expedition;
}

/** Deriva uma seed estável e distinta para cada andar a partir da seed da run. */
export function getExpeditionStageSeed(expedition: ActiveExpedition): number {
  const mixed = Math.imul(
    (expedition.seed >>> 0) ^ Math.imul(expedition.floor, 0x9e3779b1),
    0x85ebca6b,
  );
  return (mixed ^ (mixed >>> 13)) >>> 0;
}

export function getExpeditionDifficulty(floor: ExpeditionFloor): ExpeditionDifficulty {
  const values: Record<ExpeditionFloor, ExpeditionDifficulty> = {
    1: { hpMultiplier: 1, attackMultiplier: 1, speedMultiplier: 1 },
    2: { hpMultiplier: 1.25, attackMultiplier: 1.12, speedMultiplier: 1.04 },
    3: { hpMultiplier: 1.55, attackMultiplier: 1.25, speedMultiplier: 1.08 },
    4: { hpMultiplier: 1.25, attackMultiplier: 1.15, speedMultiplier: 1 },
  };
  return values[floor];
}

/** Registra uma fronteira segura que poderá ser retomada pelo Continue. */
export function checkpointExpedition(
  state: GameState,
  floor: ExpeditionFloor,
  phase: ExpeditionPhase,
  perkOffers: string[] = [],
): ActiveExpedition {
  const expedition = state.activeExpedition;
  if (!expedition) throw new Error('Nenhuma expedição ativa');
  expedition.floor = floor;
  expedition.phase = phase;
  expedition.perkOffers = [...new Set(perkOffers)];
  expedition.checkpointHp = Math.min(PLAYER_MAX_HP, Math.max(0, state.playerHp));
  expedition.checkpointStamina = Math.min(
    PLAYER_MAX_STAMINA,
    Math.max(0, state.playerStamina),
  );
  expedition.checkpointBag = cloneBag(state.bag);
  return expedition;
}

/**
 * Consome uma oferta e prepara o checkpoint do andar seguinte.
 * A tela de recompensa só será conectada na etapa 3.
 */
export function choosePerkAndAdvance(
  state: GameState,
  perkId: string,
): ActiveExpedition {
  const expedition = state.activeExpedition;
  if (!expedition || expedition.phase !== 'reward') {
    throw new Error('A expedição não está aguardando uma recompensa');
  }
  if (!expedition.perkOffers.includes(perkId)) {
    throw new Error('Perk fora das ofertas da expedição');
  }
  if (expedition.floor >= 4) {
    throw new Error('A arena final não possui próximo andar');
  }
  expedition.perks.push(perkId);
  const nextFloor = (expedition.floor + 1) as ExpeditionFloor;
  return checkpointExpedition(
    state,
    nextFloor,
    nextFloor === 4 ? 'boss' : 'exploring',
  );
}

/**
 * Transição provisória usada antes da tela de perks da etapa 3.
 * Mantém a regra de recuperação e cria imediatamente o checkpoint seguinte.
 */
export function advanceExpeditionStage(state: GameState): ActiveExpedition {
  const expedition = state.activeExpedition;
  if (!expedition) throw new Error('Nenhuma expedição ativa');
  if (expedition.floor >= 4) throw new Error('A arena final encerra a expedição');
  state.playerHp = Math.min(
    PLAYER_MAX_HP,
    state.playerHp + Math.ceil(PLAYER_MAX_HP * 0.15),
  );
  state.playerStamina = PLAYER_MAX_STAMINA;
  const nextFloor = (expedition.floor + 1) as ExpeditionFloor;
  return checkpointExpedition(
    state,
    nextFloor,
    nextFloor === 4 ? 'boss' : 'exploring',
  );
}

/** Encerra qualquer caminho de saída e impede perks/andar de vazarem para a base. */
export function endExpedition(
  state: GameState,
  _reason: ExpeditionEndReason,
): ActiveExpedition | null {
  const ended = state.activeExpedition;
  state.activeExpedition = null;
  return ended;
}
