import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { getStationWallsForCollision } from '../src/world/baseGrid.ts';
import { canPlaceHabitatPen, placeHabitatPen } from '../src/systems/baseBuild.ts';
import { BaseCellKind, getCell } from '../src/world/baseGrid.ts';

describe('baseGrid station collision', () => {
  it('includes workbench, chest and bed but not habitat pen', () => {
    const state = defaultGameState();
    const walls = getStationWallsForCollision(state.base);

    const bench = state.base.placements.find((p) => p.stationId === 'workbench')!;
    const chest = state.base.placements.find((p) => p.stationId === 'chest_wood')!;
    const bed = state.base.placements.find((p) => p.stationId === 'bed')!;

    expect(walls.some((w) => w.x === bench.cellX * 32 && w.y === bench.cellY * 32)).toBe(true);
    expect(walls.some((w) => w.x === chest.cellX * 32 && w.y === chest.cellY * 32)).toBe(true);
    expect(walls.some((w) => w.x === bed.cellX * 32 && w.y === bed.cellY * 32)).toBe(true);

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

    const withPen = getStationWallsForCollision(state.base);
    for (let dy = 0; dy < zone.height; dy++) {
      for (let dx = 0; dx < zone.width; dx++) {
        const cx = zone.cellX + dx;
        const cy = zone.cellY + dy;
        expect(withPen.some((w) => w.x === cx * 32 && w.y === cy * 32)).toBe(false);
      }
    }
  });

  it('excludes held placement from collision while relocating', () => {
    const state = defaultGameState();
    const bench = state.base.placements.find((p) => p.stationId === 'workbench')!;
    const all = getStationWallsForCollision(state.base);
    const held = getStationWallsForCollision(state.base, bench.id);

    expect(all.length).toBeGreaterThan(held.length);
    expect(all.some((w) => w.x === bench.cellX * 32 && w.y === bench.cellY * 32)).toBe(true);
    expect(held.some((w) => w.x === bench.cellX * 32 && w.y === bench.cellY * 32)).toBe(false);
  });
});
