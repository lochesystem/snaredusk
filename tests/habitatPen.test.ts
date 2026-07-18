import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { canPlaceHabitatPen, placeHabitatPen } from '../src/systems/baseBuild.ts';
import { getPenZoneCapacity } from '../src/systems/habitatZones.ts';
import { getPenCapacity, moveCreatureToHabitat } from '../src/systems/habitat.ts';
import { BaseCellKind, getCell } from '../src/world/baseGrid.ts';

describe('habitat pen', () => {
  it('cria cercado por arraste com capacidade pela área', () => {
    const state = defaultGameState();
    let spot = { x: -1, y: -1 };
    outer: for (let y = 0; y < state.base.height; y++) {
      for (let x = 0; x < state.base.width; x++) {
        if (getCell(state.base, x, y) !== BaseCellKind.Floor) continue;
        const zone = { cellX: x, cellY: y, width: 3, height: 3 };
        if (canPlaceHabitatPen(state, zone).ok) {
          spot = { x, y };
          break outer;
        }
      }
    }
    expect(spot.x).toBeGreaterThanOrEqual(0);
    const zone = { cellX: spot.x, cellY: spot.y, width: 3, height: 3 };
    const result = placeHabitatPen(state, zone);
    expect(result.ok).toBe(true);
    expect(getPenZoneCapacity(zone)).toBe(3);
    const pen = state.base.placements.find((p) => p.stationId === 'habitat_pen');
    expect(pen?.habitatZone?.width).toBe(3);
  });

  it('atribui criatura ao cercado específico', () => {
    const state = defaultGameState();
    const zone = { cellX: 8, cellY: 8, width: 2, height: 2 };
    if (!canPlaceHabitatPen(state, zone).ok) return;
    placeHabitatPen(state, zone);
    const pen = state.base.placements.find((p) => p.stationId === 'habitat_pen')!;
    state.bag[0] = {
      kind: 'creature',
      speciesId: 'sporeling',
      name: 'Teste',
      baseValue: 20,
    };
    const moved = moveCreatureToHabitat(state, 0, pen.id);
    expect(moved?.penId).toBe(pen.id);
    expect(getPenCapacity(state, pen.id)).toBeGreaterThan(0);
  });
});
