import { describe, expect, it } from 'vitest';
import { generateDungeon } from '../src/world/dungeonGenerator.ts';
import { isOnWalkableFloor, PLAYER_RADIUS } from '../src/world/collision.ts';

describe('dungeonGenerator', () => {
  it('generates 8-11 connected rooms with corridors', () => {
    const layout = generateDungeon(12345);
    expect(layout.rooms.length).toBeGreaterThanOrEqual(8);
    expect(layout.rooms.length).toBeLessThanOrEqual(11);
    expect(layout.floors.length).toBeGreaterThan(layout.rooms.length);
    expect(layout.walls.length).toBeGreaterThan(10);
  });

  it('includes required room types (boss, treasure, rest, event)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const layout = generateDungeon(seed);
      const types = new Set(layout.rooms.map((r) => r.type));
      expect(types.has('boss')).toBe(true);
      expect(types.has('treasure')).toBe(true);
      expect(types.has('rest')).toBe(true);
      expect(types.has('event')).toBe(true);
    }
  });

  it('places boss spawn and portal in the boss room', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const layout = generateDungeon(seed);
      expect(layout.portalRoomIndex).toBe(layout.bossRoomIndex);
      const bossSpawn = layout.enemySpawns.find((s) => s.isBoss);
      expect(bossSpawn?.speciesId).toBe('rei_esporas');
      expect(bossSpawn?.roomIndex).toBe(layout.bossRoomIndex);
    }
  });

  it('adds interactables for special room types', () => {
    const layout = generateDungeon(4242);
    const rest = layout.interactables.filter((i) => i.kind === 'rest');
    const events = layout.interactables.filter((i) => i.kind === 'event');
    expect(rest.length).toBeGreaterThanOrEqual(1);
    expect(events.length).toBeGreaterThanOrEqual(1);
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

  it('portal is never blocked by rocks', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const layout = generateDungeon(seed);
      for (const obs of layout.obstacles) {
        if (obs.kind !== 'rock') continue;
        const dx = layout.portal.x - obs.x;
        const dy = layout.portal.y - obs.y;
        const minDist = obs.radius + PLAYER_RADIUS + 8;
        expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(minDist * minDist);
      }
    }
  });
});
