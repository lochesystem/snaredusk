import { describe, expect, it } from 'vitest';
import {
  buildNavGrid,
  findPathOnGrid,
  moveAlongPath,
  shouldReplanPath,
} from '../src/world/pathfinding.ts';

describe('pathfinding', () => {
  const floors = [{ x: 0, y: 0, width: 200, height: 120 }];
  const walls = [
    { x: 90, y: 0, width: 20, height: 40 },
    { x: 90, y: 80, width: 20, height: 40 },
  ];

  it('encontra caminho contornando parede', () => {
    const grid = buildNavGrid(floors, walls);
    const path = findPathOnGrid(grid, 20, 60, 160, 60);
    expect(path.length).toBeGreaterThan(1);
    const crossesWall = path.some((p) => p.x > 82 && p.x < 118 && (p.y < 52 || p.y > 68));
    expect(crossesWall).toBe(false);
  });

  it('move ao longo do caminho', () => {
    const grid = buildNavGrid(floors, walls);
    const path = findPathOnGrid(grid, 20, 60, 160, 60);
    const moved = moveAlongPath(20, 60, path, 0, 120, 0.1, 8, walls, floors);
    expect(moved.moved).toBe(true);
    expect(moved.x).not.toBe(20);
  });

  it('contorna cristais sólidos como contorna pedras', () => {
    const crystals = [{
      kind: 'crystal' as const,
      x: 100,
      y: 60,
      radius: 18,
      roomIndex: 0,
      variant: 1,
    }];
    const grid = buildNavGrid(floors, [], crystals);
    const path = findPathOnGrid(grid, 20, 60, 180, 60);
    expect(path.length).toBeGreaterThan(1);
    expect(path.every((point) => Math.hypot(point.x - 100, point.y - 60) >= 18)).toBe(true);
  });

  it('replana quando o alvo muda', () => {
    expect(shouldReplanPath(100, 0, 0, 0, [{ x: 1, y: 1 }], 0, 0, 1)).toBe(true);
    expect(shouldReplanPath(10, 10, 10, 10, [{ x: 20, y: 20 }], 0, 0, 1)).toBe(false);
    expect(shouldReplanPath(10, 10, 10, 10, [{ x: 20, y: 20 }], 0, 0.5, 1)).toBe(true);
  });
});
