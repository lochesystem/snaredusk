import { HABITAT_CAPACITY } from '../engine/constants.ts';
import type { CreatureItem, GameState } from '../types.ts';
import { addToBag } from './saveManager.ts';

export type PartySource =
  | { kind: 'bag'; index: number }
  | { kind: 'habitat'; index: number };

function creatureFromSource(state: GameState, source: PartySource): CreatureItem | null {
  if (source.kind === 'bag') {
    const entry = state.bag[source.index];
    if (!entry || entry.kind !== 'creature') return null;
    return { ...entry };
  }
  const creature = state.habitat[source.index];
  return creature ? { ...creature } : null;
}

/** Devolve companheiro atual à bolsa ou habitat. */
export function stashPartyCompanion(state: GameState): boolean {
  if (!state.partyCompanion) return true;

  if (addToBag(state, { ...state.partyCompanion })) {
    state.partyCompanion = null;
    return true;
  }

  if (state.habitat.length < HABITAT_CAPACITY) {
    state.habitat.push({ ...state.partyCompanion });
    state.partyCompanion = null;
    return true;
  }

  return false;
}

/** Escolhe criatura da bolsa ou habitat como companheiro (máx. 1). */
export function assignPartyCompanion(state: GameState, source: PartySource): CreatureItem | null {
  const creature = creatureFromSource(state, source);
  if (!creature) return null;

  if (state.partyCompanion) {
    const stashed = stashPartyCompanion(state);
    if (!stashed) return null;
  }

  if (source.kind === 'bag') {
    state.bag[source.index] = null;
  } else {
    state.habitat.splice(source.index, 1);
  }

  state.partyCompanion = creature;
  return creature;
}

/** Remove companheiro sem devolver (morte na masmorra). */
export function losePartyCompanion(state: GameState): void {
  state.partyCompanion = null;
}

export function togglePartyCompanion(state: GameState, source: PartySource): 'assigned' | 'cleared' | 'failed' {
  const creature = creatureFromSource(state, source);
  if (!creature) return 'failed';

  if (
    state.partyCompanion &&
    state.partyCompanion.speciesId === creature.speciesId &&
    state.partyCompanion.name === creature.name
  ) {
    return stashPartyCompanion(state) ? 'cleared' : 'failed';
  }

  return assignPartyCompanion(state, source) ? 'assigned' : 'failed';
}
