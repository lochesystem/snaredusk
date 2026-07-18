import { HABITAT_CAPACITY } from '../engine/constants.ts';
import type { BasePlacement, CreatureItem, GameState } from '../types.ts';
import { DEFAULT_PEN_ID, getPenZoneCapacity } from './habitatZones.ts';

export function listHabitatPens(state: GameState): BasePlacement[] {
  return state.base.placements.filter((p) => p.stationId === 'habitat_pen' && p.habitatZone);
}

export function creaturePenId(creature: CreatureItem): string | null {
  if (!creature.penId || creature.penId === DEFAULT_PEN_ID) return null;
  return creature.penId;
}

export function countCreaturesInPen(state: GameState, penId: string): number {
  return state.habitat.filter((c) => c.penId === penId).length;
}

export function getPenCapacity(state: GameState, penId: string): number {
  const placement = state.base.placements.find((p) => p.id === penId && p.stationId === 'habitat_pen');
  if (!placement?.habitatZone) return 0;
  return getPenZoneCapacity(placement.habitatZone);
}

export function getHabitatCapacity(state: GameState): number {
  if (!state.base) return HABITAT_CAPACITY;
  let cap = 0;
  for (const p of listHabitatPens(state)) {
    cap += getPenZoneCapacity(p.habitatZone!);
  }
  return cap;
}

export function penHasSpace(state: GameState, penId: string): boolean {
  return countCreaturesInPen(state, penId) < getPenCapacity(state, penId);
}

export function habitatHasSpace(state: GameState): boolean {
  return state.habitat.length < getHabitatCapacity(state);
}

export function moveCreatureToHabitat(
  state: GameState,
  bagIndex: number,
  penId: string,
): CreatureItem | null {
  const entry = state.bag[bagIndex];
  if (!entry || entry.kind !== 'creature') return null;
  if (!listHabitatPens(state).some((p) => p.id === penId)) return null;
  if (!penHasSpace(state, penId)) return null;

  state.bag[bagIndex] = null;
  const creature: CreatureItem = { ...entry, penId };
  state.habitat.push(creature);
  return creature;
}

export function moveCreatureToBag(state: GameState, habitatIndex: number): CreatureItem | null {
  const creature = state.habitat[habitatIndex];
  if (!creature) return null;

  const emptySlot = state.bag.findIndex((slot) => slot === null);
  if (emptySlot === -1) return null;

  state.habitat.splice(habitatIndex, 1);
  const { penId: _penId, ...rest } = creature;
  state.bag[emptySlot] = rest;
  return creature;
}

export function moveCreatureToPen(
  state: GameState,
  habitatIndex: number,
  targetPenId: string,
): CreatureItem | null {
  const creature = state.habitat[habitatIndex];
  if (!creature) return null;
  if (creature.penId === targetPenId) return creature;
  if (!listHabitatPens(state).some((p) => p.id === targetPenId)) return null;
  if (!penHasSpace(state, targetPenId)) return null;

  creature.penId = targetPenId;
  return creature;
}

export function getZoneForPen(state: GameState, penId: string) {
  const placement = state.base.placements.find((p) => p.id === penId);
  return placement?.habitatZone ?? null;
}

/** Migra criaturas do habitat principal antigo para cercados ou bolsa. */
export function migrateLegacyHabitatCreatures(state: GameState): void {
  const pens = listHabitatPens(state);
  for (let i = state.habitat.length - 1; i >= 0; i--) {
    const c = state.habitat[i];
    const valid = c.penId && c.penId !== DEFAULT_PEN_ID && pens.some((p) => p.id === c.penId);
    if (valid) continue;

    let placed = false;
    for (const pen of pens) {
      if (penHasSpace(state, pen.id)) {
        c.penId = pen.id;
        placed = true;
        break;
      }
    }
    if (placed) continue;

    const empty = state.bag.findIndex((s) => s === null);
    if (empty === -1) continue;
    const { penId: _p, ...rest } = c;
    state.bag[empty] = rest;
    state.habitat.splice(i, 1);
  }
}
