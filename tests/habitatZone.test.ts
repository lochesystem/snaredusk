import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import {
  clampToHabitat,
  getHabitatWorldBounds,
  getHabitatZone,
  isCellInHabitatZone,
  randomPointInHabitat,
} from '../src/world/baseGrid.ts';

describe('habitat zone', () => {
  it('define zona fixa na sala inicial', () => {
    const state = defaultGameState();
    const zone = getHabitatZone(state.base);
    expect(zone.width).toBeGreaterThan(0);
    expect(zone.height).toBeGreaterThan(0);
    expect(isCellInHabitatZone(state.base, zone.cellX, zone.cellY)).toBe(true);
  });

  it('pontos aleatórios ficam dentro dos limites', () => {
    const state = defaultGameState();
    const bounds = getHabitatWorldBounds(state.base);
    for (let i = 0; i < 20; i++) {
      const pt = randomPointInHabitat(state.base, Math.random);
      expect(pt.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(pt.x).toBeLessThanOrEqual(bounds.maxX);
      expect(pt.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(pt.y).toBeLessThanOrEqual(bounds.maxY);
    }
  });

  it('clamp mantém criatura na zona', () => {
    const state = defaultGameState();
    const bounds = getHabitatWorldBounds(state.base);
    const clamped = clampToHabitat(state.base, bounds.maxX + 200, bounds.minY - 200);
    expect(clamped.x).toBeLessThanOrEqual(bounds.maxX);
    expect(clamped.y).toBeGreaterThanOrEqual(bounds.minY);
  });
});
