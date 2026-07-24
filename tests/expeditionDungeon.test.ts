import { describe, expect, it } from 'vitest';
import {
  generateBossArena,
  generateExpeditionFloor,
} from '../src/world/dungeonGenerator.ts';
import { isOnWalkableFloor, PLAYER_RADIUS } from '../src/world/collision.ts';

describe('geração dos andares da expedição', () => {
  const expectations = {
    1: { rooms: [5, 6], enemies: [5, 7] },
    2: { rooms: [6, 7], enemies: [7, 10] },
    3: { rooms: [7, 8], enemies: [9, 12] },
  } as const;

  for (const floor of [1, 2, 3] as const) {
    it(`gera o andar ${floor} compacto, conectado e sem chefe`, () => {
      for (let seed = 1; seed <= 100; seed++) {
        const layout = generateExpeditionFloor({
          biomeId: 'floresta',
          floor,
          seed,
          includeBoss: false,
        });
        const expected = expectations[floor];

        expect(layout.rooms.length).toBeGreaterThanOrEqual(expected.rooms[0]);
        expect(layout.rooms.length).toBeLessThanOrEqual(expected.rooms[1]);
        expect(layout.enemySpawns.length).toBeGreaterThanOrEqual(expected.enemies[0]);
        expect(layout.enemySpawns.length).toBeLessThanOrEqual(expected.enemies[1]);
        expect(layout.enemySpawns.some((spawn) => spawn.isBoss)).toBe(false);
        expect(layout.rooms.some((room) => room.type === 'boss')).toBe(false);
        expect(layout.bossRoomIndex).toBe(-1);
        expect(layout.bossGateWalls).toEqual([]);
        expect(layout.portalRoomIndex).not.toBe(0);
        expect(layout.portalKind).toBe('floor');
        const portalRoom = layout.rooms.find(
          (room) => room.index === layout.portalRoomIndex,
        );
        expect(portalRoom?.type).toBe('combat');
        expect(layout.portal).toEqual({
          x: portalRoom!.rect.x + portalRoom!.rect.width / 2,
          y: portalRoom!.rect.y + portalRoom!.rect.height / 2,
        });
        expect(
          layout.interactables.some(
            (item) => item.roomIndex === layout.portalRoomIndex,
          ),
        ).toBe(false);
        expect(
          layout.chests.some(
            (chest) => chest.roomIndex === layout.portalRoomIndex,
          ),
        ).toBe(false);
        expect(
          layout.hazards.some(
            (hazard) => hazard.roomIndex === layout.portalRoomIndex,
          ),
        ).toBe(false);
        expect(
          isOnWalkableFloor(layout.portal.x, layout.portal.y, PLAYER_RADIUS, layout.floors),
        ).toBe(true);
      }
    });
  }

  it('é determinístico para a mesma seed, bioma e andar', () => {
    const context = {
      biomeId: 'floresta' as const,
      floor: 2 as const,
      seed: 909090,
      includeBoss: false as const,
    };

    expect(generateExpeditionFloor(context)).toEqual(generateExpeditionFloor(context));
  });

  it('varia deterministicamente a sala limpa escolhida para o portal', () => {
    const positions = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const layout = generateExpeditionFloor({
        biomeId: 'floresta',
        floor: 2,
        seed,
        includeBoss: false,
      });
      const room = layout.rooms.find(
        (candidate) => candidate.index === layout.portalRoomIndex,
      )!;
      positions.add(`${room.gx},${room.gy}`);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('gera uma arena isolada com somente o Rei das Esporas', () => {
    const arena = generateBossArena(30303, 'floresta');

    expect(arena.rooms).toHaveLength(1);
    expect(arena.rooms[0]?.type).toBe('boss');
    expect(arena.portalKind).toBe('boss');
    expect(arena.connections).toEqual([]);
    expect(arena.bossGateWalls).toEqual([]);
    expect(arena.enemySpawns).toHaveLength(1);
    expect(arena.enemySpawns[0]).toMatchObject({
      speciesId: 'rei_esporas',
      roomIndex: 0,
      isBoss: true,
    });
    expect(isOnWalkableFloor(
      arena.spawn.x,
      arena.spawn.y,
      PLAYER_RADIUS,
      arena.floors,
    )).toBe(true);
  });
});
