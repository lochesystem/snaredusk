import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { canPlaceStation, placeStation, removePlacement, relocatePlacement } from '../src/systems/baseBuild.ts';
import { BaseCellKind, getCell } from '../src/world/baseGrid.ts';

describe('baseBuild', () => {
  it('não permite construir sem ter fabricado o item', () => {
    const state = defaultGameState();
    state.craftedStations.chest_wood = 0;
    let floor = { x: -1, y: -1 };
    for (let y = 0; y < state.base.height && floor.x < 0; y++) {
      for (let x = 0; x < state.base.width; x++) {
        if (getCell(state.base, x, y) === BaseCellKind.Floor) {
          floor = { x, y };
          break;
        }
      }
    }
    const result = canPlaceStation(state, 'chest_wood', floor.x, floor.y);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Fabrique');
  });

  it('consome primeiro uma construção fabricada sem cobrar ouro', () => {
    const state = defaultGameState();
    state.craftedStations.chest_wood = 1;
    state.gold = 0;

    let spot: { x: number; y: number } | null = null;
    for (let y = 0; y < state.base.height && !spot; y++) {
      for (let x = 0; x < state.base.width; x++) {
        if (canPlaceStation(state, 'chest_wood', x, y).ok) {
          spot = { x, y };
          break;
        }
      }
    }

    expect(spot).not.toBeNull();
    expect(placeStation(state, 'chest_wood', spot!.x, spot!.y).ok).toBe(true);
    expect(state.craftedStations.chest_wood).toBe(0);
    expect(state.gold).toBe(0);
  });

  it('coloca baú em chão livre', () => {
    const state = defaultGameState();
    state.craftedStations.chest_wood = 1;
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

  it('reloca bancada para outra célula', () => {
    const state = defaultGameState();
    const bench = state.base.placements.find((p) => p.stationId === 'workbench')!;
    let spot = { x: -1, y: -1 };
    outer: for (let y = 0; y < state.base.height; y++) {
      for (let x = 0; x < state.base.width; x++) {
        if (getCell(state.base, x, y) !== BaseCellKind.Floor) continue;
        if (canPlaceStation(state, 'workbench', x, y, bench.id).ok) {
          if (x !== bench.cellX || y !== bench.cellY) {
            spot = { x, y };
            break outer;
          }
        }
      }
    }
    expect(spot.x).toBeGreaterThanOrEqual(0);
    const result = relocatePlacement(state, bench.id, spot.x, spot.y);
    expect(result.ok).toBe(true);
    expect(bench.cellX).toBe(spot.x);
    expect(bench.cellY).toBe(spot.y);
  });

  it('gira bancada em 90 graus e troca a área ocupada de 2x1 para 1x2', () => {
    const state = defaultGameState();
    state.craftedStations.chest_wood = 1;
    const bench = state.base.placements.find((p) => p.stationId === 'workbench')!;
    let spot = { x: -1, y: -1 };
    outer: for (let y = 0; y < state.base.height; y++) {
      for (let x = 0; x < state.base.width; x++) {
        if (canPlaceStation(state, 'workbench', x, y, bench.id, 1).ok
          && canPlaceStation(state, 'chest_wood', x + 1, y, bench.id).ok) {
          spot = { x, y };
          break outer;
        }
      }
    }

    expect(relocatePlacement(state, bench.id, spot.x, spot.y, 1).ok).toBe(true);
    expect(bench.rotation).toBe(1);
    expect(canPlaceStation(state, 'chest_wood', spot.x, spot.y + 1).ok).toBe(false);
    expect(canPlaceStation(state, 'chest_wood', spot.x + 1, spot.y).ok).toBe(true);
  });

  it('mantém o portal na orientação fixa ao reposicionar', () => {
    const state = defaultGameState();
    const portal = state.base.placements.find((p) => p.stationId === 'dungeon_portal')!;
    expect(relocatePlacement(state, portal.id, portal.cellX, portal.cellY, 1).ok).toBe(true);
    expect(portal.rotation).toBe(0);
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

  it('devolve a construção ao inventário quando uma estação vazia é recolhida', () => {
    const state = defaultGameState();
    const bench = state.base.placements.find((p) => p.stationId === 'workbench')!;
    const before = state.craftedStations.workbench ?? 0;
    expect(removePlacement(state, bench.id).ok).toBe(true);
    expect(state.craftedStations.workbench).toBe(before + 1);
  });

  it.each(['dungeon_portal', 'shop_ladder'] as const)(
    'move %s como os demais elementos da base, mas não permite remover',
    (stationId) => {
      const state = defaultGameState();
      const placement = state.base.placements.find((p) => p.stationId === stationId)!;
      let spot = { x: -1, y: -1 };
      outer: for (let y = 0; y < state.base.height; y++) {
        for (let x = 0; x < state.base.width; x++) {
          if (canPlaceStation(state, stationId, x, y, placement.id).ok
            && (x !== placement.cellX || y !== placement.cellY)) {
            spot = { x, y };
            break outer;
          }
        }
      }

      expect(spot.x).toBeGreaterThanOrEqual(0);
      expect(relocatePlacement(state, placement.id, spot.x, spot.y).ok).toBe(true);
      expect(placement.cellX).toBe(spot.x);
      expect(placement.cellY).toBe(spot.y);
      expect(removePlacement(state, placement.id).ok).toBe(false);
    },
  );
});
