import { describe, expect, it } from 'vitest';
import { findSpatialNavigationIndex } from '../src/ui/controllerNavigation.ts';

describe('controllerNavigation', () => {
  const grid = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 200, y: 0 },
    { x: 0, y: 100 },
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ];

  it('navega geometricamente em grids', () => {
    expect(findSpatialNavigationIndex(grid, 1, 'left')).toBe(0);
    expect(findSpatialNavigationIndex(grid, 1, 'right')).toBe(2);
    expect(findSpatialNavigationIndex(grid, 1, 'down')).toBe(4);
    expect(findSpatialNavigationIndex(grid, 4, 'up')).toBe(1);
  });

  it('mantém a seleção quando não há elemento naquela direção', () => {
    expect(findSpatialNavigationIndex(grid, 0, 'left')).toBe(0);
    expect(findSpatialNavigationIndex(grid, 5, 'down')).toBe(5);
  });
});
