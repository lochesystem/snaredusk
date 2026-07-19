import { describe, expect, it } from 'vitest';
import { defaultGameState, type CreatureItem } from '../src/types.ts';
import { bagCount } from '../src/systems/saveManager.ts';
import { collectHabitatProduction } from '../src/systems/habitatProduction.ts';
import { canPlaceHabitatPen, placeHabitatPen } from '../src/systems/baseBuild.ts';
import { BaseCellKind, getCell } from '../src/world/baseGrid.ts';

const lumimorcego: CreatureItem = {
  kind: 'creature',
  speciesId: 'lumimorcego',
  name: 'Lumimorcego',
  baseValue: 65,
};

const boss: CreatureItem = {
  kind: 'creature',
  speciesId: 'rei_esporas',
  name: 'Rei das Esporas',
  baseValue: 200,
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

describe('habitatProduction', () => {
  it('adds loot to bag for species with yield in a valid pen', () => {
    const state = defaultGameState();
    const penId = addTestPen(state);
    state.habitat = [{ ...lumimorcego, penId }];

    const result = collectHabitatProduction(state);
    expect(result.collected).toHaveLength(1);
    expect(result.collected[0]?.lootId).toBe('po_bioluminescente');
    expect(result.collected[0]?.quantity).toBe(2);
    expect(result.overflow).toHaveLength(0);
    expect(bagCount(state)).toBe(1);
    const loot = state.bag.find((s) => s?.kind === 'loot');
    expect(loot?.kind).toBe('loot');
    if (loot?.kind === 'loot') {
      expect(loot.id).toBe('po_bioluminescente');
      expect(loot.quantity).toBe(2);
    }
  });

  it('ignores boss species without yield entry', () => {
    const state = defaultGameState();
    const penId = addTestPen(state);
    state.habitat = [{ ...boss, penId }];

    const result = collectHabitatProduction(state);
    expect(result.collected).toHaveLength(0);
    expect(result.overflow).toHaveLength(0);
    expect(bagCount(state)).toBe(0);
  });

  it('reports overflow when bag is full', () => {
    const state = defaultGameState();
    const penId = addTestPen(state);
    state.habitat = [{ ...lumimorcego, penId }];
    for (let i = 0; i < state.bag.length; i++) {
      state.bag[i] = {
        kind: 'loot',
        id: 'cogumelo_comum',
        name: 'Cogumelo comum',
        baseValue: 15,
        quantity: 1,
      };
    }

    const result = collectHabitatProduction(state);
    expect(result.collected).toHaveLength(0);
    expect(result.overflow).toHaveLength(1);
    expect(result.overflow[0]?.lootId).toBe('po_bioluminescente');
    expect(bagCount(state)).toBe(12);
  });
});
