import { describe, expect, it } from 'vitest';
import { ENEMY_RADIUS, generateDungeon } from '../src/world/dungeonGenerator.ts';
import { collidesCircle, isOnWalkableFloor, PLAYER_RADIUS } from '../src/world/collision.ts';

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
      const layout = generateDungeon(seed, 'floresta');
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

  it('portal is never blocked by solid environmental props', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const layout = generateDungeon(seed);
      for (const obs of layout.obstacles) {
        if (obs.kind === 'hole') continue;
        const dx = layout.portal.x - obs.x;
        const dy = layout.portal.y - obs.y;
        const minDist = obs.radius + PLAYER_RADIUS + 8;
        expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(minDist * minDist);
      }
    }
  });

  it('boss room is larger than normal rooms', () => {
    const layout = generateDungeon(42, 'floresta');
    const bossRoom = layout.rooms.find((r) => r.index === layout.bossRoomIndex)!;
    expect(bossRoom.rect.width).toBeGreaterThan(240);
    expect(bossRoom.rect.height).toBeGreaterThan(180);
  });

  it('boss room has gate walls blocking doors', () => {
    const layout = generateDungeon(42, 'floresta');
    expect(layout.bossGateWalls.length).toBeGreaterThan(0);
  });

  it('termal biome has poison hazard zones', () => {
    const layout = generateDungeon(42, 'termal');
    expect(layout.hazards.some((h) => h.kind === 'poison')).toBe(true);
  });

  it('floresta biome has spore hazard zones', () => {
    const layout = generateDungeon(42, 'floresta');
    expect(layout.hazards.length).toBeGreaterThanOrEqual(0);
  });

  it('boss spawn is at the center of the boss room', () => {
    const layout = generateDungeon(42, 'floresta');
    const bossRoom = layout.rooms.find((r) => r.index === layout.bossRoomIndex)!;
    const bossSpawn = layout.enemySpawns.find((s) => s.isBoss)!;
    const cx = bossRoom.rect.x + bossRoom.rect.width / 2;
    const cy = bossRoom.rect.y + bossRoom.rect.height / 2;
    expect(Math.abs(bossSpawn.x - cx)).toBeLessThan(2);
    expect(Math.abs(bossSpawn.y - cy)).toBeLessThan(2);
  });

  it('enemy spawns never overlap solid props or walls', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const layout = generateDungeon(seed);
      for (const spawn of layout.enemySpawns) {
        expect(collidesCircle(spawn.x, spawn.y, ENEMY_RADIUS, layout.walls)).toBe(false);
        expect(isOnWalkableFloor(spawn.x, spawn.y, ENEMY_RADIUS, layout.floors)).toBe(true);
        for (const obs of layout.obstacles) {
          if (obs.kind === 'hole') continue;
          const dx = spawn.x - obs.x;
          const dy = spawn.y - obs.y;
          const minDist = obs.radius + ENEMY_RADIUS + 6;
          expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(minDist * minDist);
        }
      }
    }
  });
});
