import { describe, expect, it } from 'vitest';
import { defaultGameState, type CreatureItem } from '../src/types.ts';
import { canPlaceHabitatPen, placeHabitatPen } from '../src/systems/baseBuild.ts';
import {
  habitatHasSpace,
  moveCreatureToBag,
  moveCreatureToHabitat,
} from '../src/systems/habitat.ts';
import { BaseCellKind, getCell } from '../src/world/baseGrid.ts';

const sporo: CreatureItem = {
  kind: 'creature',
  speciesId: 'esporo_dorminhoco',
  name: 'Esporo Dorminhoco',
  baseValue: 40,
};

function addTestPen(state: ReturnType<typeof defaultGameState>) {
  let zone = { cellX: 0, cellY: 0, width: 2, height: 2 };
  outer: for (let y = 0; y < state.base.height; y++) {
    for (let x = 0; x < state.base.width; x++) {
      if (getCell(state.base, x, y) !== BaseCellKind.Floor) continue;
      const candidate = { cellX: x, cellY: y, width: 2, height: 2 };
      if (canPlaceHabitatPen(state, candidate).ok) {
        zone = candidate;
        break outer;
      }
    }
  }
  placeHabitatPen(state, zone);
  return state.base.placements.find((p) => p.stationId === 'habitat_pen')!.id;
}

describe('habitat', () => {
  it('moves creature from bag to cercado', () => {
    const state = defaultGameState();
    const penId = addTestPen(state);
    state.bag[0] = sporo;

    const moved = moveCreatureToHabitat(state, 0, penId);
    expect(moved?.name).toBe('Esporo Dorminhoco');
    expect(moved?.penId).toBe(penId);
    expect(state.bag[0]).toBeNull();
    expect(state.habitat).toHaveLength(1);
  });

  it('returns creature from habitat to bag', () => {
    const state = defaultGameState();
    const penId = addTestPen(state);
    state.habitat = [{ ...sporo, penId }];

    const moved = moveCreatureToBag(state, 0);
    expect(moved?.name).toBe('Esporo Dorminhoco');
    expect(state.habitat).toHaveLength(0);
    expect(state.bag.some((slot) => slot?.kind === 'creature')).toBe(true);
  });

  it('respects cercado capacity', () => {
    const state = defaultGameState();
    const penId = addTestPen(state);
    state.habitat = [{ ...sporo, penId }];
    state.bag[0] = { ...sporo, name: 'Extra' };

    expect(habitatHasSpace(state)).toBe(false);
    expect(moveCreatureToHabitat(state, 0, penId)).toBeNull();
  });
});
