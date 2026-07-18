import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { canPlaceStation, placeStation, removePlacement } from '../src/systems/baseBuild.ts';
import { BaseCellKind, getCell } from '../src/world/baseGrid.ts';

describe('baseBuild', () => {
  it('coloca baú em chão livre', () => {
    const state = defaultGameState();
    let spot = { x: -1, y: -1 };
    outer: for (let y = 0; y < state.base.height; y++) {
      for (let x = 0; x < state.base.width; x++) {
        if (getCell(state.base, x, y) !== BaseCellKind.Floor) continue;
        if (canPlaceStation(state, 'chest_wood', x, y).ok) {
          spot = { x, y };
          break outer;
        }
      }
    }
    expect(spot.x).toBeGreaterThanOrEqual(0);
    const before = state.base.placements.length;
    const result = placeStation(state, 'chest_wood', spot.x, spot.y);
    expect(result.ok).toBe(true);
    expect(state.base.placements.length).toBe(before + 1);
    expect(state.base.chests.length).toBeGreaterThan(1);
  });

  it('não remove baú com itens', () => {
    const state = defaultGameState();
    const chest = state.base.chests[0];
    chest.slots[0] = {
      kind: 'loot',
      id: 'cogumelo_comum',
      name: 'Cogumelo comum',
      baseValue: 15,
      quantity: 1,
    };
    const placement = state.base.placements.find((p) => p.id === chest.id)!;
    const removed = removePlacement(state, placement.id);
    expect(removed.ok).toBe(false);
  });
});
