import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import {
  craftWeaponFromWorkbench,
  getAdjacentChestsForWorkbench,
  getCraftPreviewFromSources,
} from '../src/systems/adjacentCraft.ts';

describe('adjacentCraft', () => {
  it('encontra baú adjacente à bancada default', () => {
    const state = defaultGameState();
    const bench = state.base.placements.find((p) => p.stationId === 'workbench')!;
    const adjacent = getAdjacentChestsForWorkbench(state, bench.cellX, bench.cellY);
    expect(adjacent.length).toBeGreaterThanOrEqual(1);
  });

  it('crafta picareta com materiais no baú adjacente', () => {
    const state = defaultGameState();
    const bench = state.base.placements.find((p) => p.stationId === 'workbench')!;
    const chest = state.base.chests[0];
    chest.slots[0] = {
      kind: 'loot',
      id: 'fibra_musgo',
      name: 'Fibra de musgo',
      baseValue: 20,
      quantity: 5,
    };
    state.gold = 100;

    const preview = getCraftPreviewFromSources(state, 'craft_picareta', bench.cellX, bench.cellY);
    expect(preview.canCraft).toBe(true);
    expect(craftWeaponFromWorkbench(state, 'craft_picareta', bench.cellX, bench.cellY)).toBe(true);
    expect(state.ownedWeapons).toContain('picareta_combate');
  });
});
