import { HABITAT_CAPACITY } from '../engine/constants.ts';
import type { CreatureItem, GameState } from '../types.ts';

export function habitatHasSpace(state: GameState): boolean {
  return state.habitat.length < HABITAT_CAPACITY;
}

export function moveCreatureToHabitat(state: GameState, bagIndex: number): CreatureItem | null {
  const entry = state.bag[bagIndex];
  if (!entry || entry.kind !== 'creature') return null;
  if (!habitatHasSpace(state)) return null;

  state.bag[bagIndex] = null;
  state.habitat.push(entry);
  return entry;
}

export function moveCreatureToBag(state: GameState, habitatIndex: number): CreatureItem | null {
  const creature = state.habitat[habitatIndex];
  if (!creature) return null;

  const emptySlot = state.bag.findIndex((slot) => slot === null);
  if (emptySlot === -1) return null;

  state.habitat.splice(habitatIndex, 1);
  state.bag[emptySlot] = creature;
  return creature;
}
