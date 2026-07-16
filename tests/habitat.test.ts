import { describe, expect, it } from 'vitest';
import { defaultGameState, type CreatureItem } from '../src/types.ts';
import {
  habitatHasSpace,
  moveCreatureToBag,
  moveCreatureToHabitat,
} from '../src/systems/habitat.ts';

const sporo: CreatureItem = {
  kind: 'creature',
  speciesId: 'esporo_dorminhoco',
  name: 'Esporo Dorminhoco',
  baseValue: 40,
};

describe('habitat', () => {
  it('moves creature from bag to habitat', () => {
    const state = defaultGameState();
    state.bag[0] = sporo;

    const moved = moveCreatureToHabitat(state, 0);
    expect(moved?.name).toBe('Esporo Dorminhoco');
    expect(state.bag[0]).toBeNull();
    expect(state.habitat).toHaveLength(1);
  });

  it('returns creature from habitat to bag', () => {
    const state = defaultGameState();
    state.habitat = [sporo];

    const moved = moveCreatureToBag(state, 0);
    expect(moved?.name).toBe('Esporo Dorminhoco');
    expect(state.habitat).toHaveLength(0);
    expect(state.bag.some((slot) => slot?.kind === 'creature')).toBe(true);
  });

  it('respects habitat capacity', () => {
    const state = defaultGameState();
    state.habitat = Array.from({ length: 4 }, () => ({ ...sporo }));
    state.bag[0] = { ...sporo, name: 'Extra' };

    expect(habitatHasSpace(state)).toBe(false);
    expect(moveCreatureToHabitat(state, 0)).toBeNull();
  });
});
