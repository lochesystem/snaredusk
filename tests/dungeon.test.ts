import { describe, expect, it } from 'vitest';
import { generateDungeon } from '../src/world/dungeonGenerator.ts';
import { isOnWalkableFloor, PLAYER_RADIUS } from '../src/world/collision.ts';

describe('dungeonGenerator', () => {
  it('generates 7-9 connected rooms with corridors', () => {
    const layout = generateDungeon(12345);
    expect(layout.rooms.length).toBeGreaterThanOrEqual(7);
    expect(layout.rooms.length).toBeLessThanOrEqual(9);
    expect(layout.floors.length).toBeGreaterThan(layout.rooms.length);
    expect(layout.walls.length).toBeGreaterThan(10);
  });

  it('can branch vertically with north/south doors', () => {
    const layout = generateDungeon(4242);
    const hasVertical = layout.rooms.some(
      (r) => r.doors.includes('n') || r.doors.includes('s'),
    );
    expect(hasVertical).toBe(true);
  });

  it('spawn is inside first room floor', () => {
    const layout = generateDungeon(99);
    const room = layout.rooms[0]!.rect;
    expect(layout.spawn.x).toBeGreaterThan(room.x);
    expect(layout.spawn.x).toBeLessThan(room.x + room.width);
    expect(layout.spawn.y).toBeGreaterThan(room.y);
    expect(layout.spawn.y).toBeLessThan(room.y + room.height);
  });

  it('spreads decor with safe margins', () => {
    const layout = generateDungeon(7);
    expect(layout.decor.length).toBeGreaterThan(20);
    for (const m of layout.decor) {
      expect(m.x).toBeGreaterThan(0);
      expect(m.y).toBeGreaterThan(0);
    }
  });

  it('player cannot stand in void between floors', () => {
    const layout = generateDungeon(7);
    const voidX = layout.rooms[0]!.rect.x + 20;
    const voidY = layout.rooms[0]!.rect.y - 30;
    expect(isOnWalkableFloor(voidX, voidY, PLAYER_RADIUS, layout.floors)).toBe(false);
  });

  it('spawn room always has an exit', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const layout = generateDungeon(seed);
      const spawnRoom = layout.rooms.find((r) => r.index === 0);
      expect(spawnRoom?.doors.length).toBeGreaterThan(0);
      expect(isOnWalkableFloor(layout.spawn.x, layout.spawn.y, PLAYER_RADIUS, layout.floors)).toBe(true);
    }
  });
});
