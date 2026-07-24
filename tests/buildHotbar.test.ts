import { describe, expect, it } from 'vitest';
import {
  assignBuildHotbar,
  assignBuildToFirstAvailable,
  normalizeBuildHotbar,
} from '../src/systems/buildHotbar.ts';
import { defaultGameState } from '../src/types.ts';

describe('buildHotbar', () => {
  it('atribui apenas construções que existem no inventário', () => {
    const state = defaultGameState();
    state.craftedStations.bed = 0;
    expect(assignBuildHotbar(state, 'bed', 0)).toBe(false);

    state.craftedStations.bed = 2;
    expect(assignBuildHotbar(state, 'bed', 0)).toBe(true);
    expect(state.buildHotbar[0]).toBe('bed');
  });

  it('move uma construção sem duplicá-la em dois slots', () => {
    const state = defaultGameState();
    state.craftedStations.habitat_pen = 2;
    expect(assignBuildHotbar(state, 'habitat_pen', 0)).toBe(true);
    expect(state.buildHotbar.filter((id) => id === 'habitat_pen')).toHaveLength(1);
  });

  it('usa o primeiro slot vazio e normaliza saves antigos', () => {
    const state = defaultGameState();
    state.buildHotbar = [null, 'chest_wood', 'habitat_pen', 'bed'];
    state.craftedStations.workbench = 1;
    expect(assignBuildToFirstAvailable(state, 'workbench')).toBe(0);
    expect(normalizeBuildHotbar(undefined)).toEqual([
      'workbench',
      'chest_wood',
      'habitat_pen',
      'bed',
    ]);
  });
});
