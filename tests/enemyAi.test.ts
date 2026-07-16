import { describe, expect, it } from 'vitest';
import {
  BOSS_AGGRO_RADIUS,
  ENEMY_AGGRO_RADIUS,
  ENEMY_LEASH_RADIUS,
  shouldEnemyAggro,
} from '../src/systems/enemyAi.ts';

describe('shouldEnemyAggro', () => {
  it('does not aggro when player is outside spawn room', () => {
    expect(
      shouldEnemyAggro({
        aggroed: false,
        enraged: false,
        isBoss: false,
        distToPlayer: 20,
        playerInSpawnRoom: false,
      }),
    ).toBe(false);
  });

  it('aggroes when player enters room within radius', () => {
    expect(
      shouldEnemyAggro({
        aggroed: false,
        enraged: false,
        isBoss: false,
        distToPlayer: ENEMY_AGGRO_RADIUS - 1,
        playerInSpawnRoom: true,
      }),
    ).toBe(true);
  });

  it('does not aggro beyond detection radius', () => {
    expect(
      shouldEnemyAggro({
        aggroed: false,
        enraged: false,
        isBoss: false,
        distToPlayer: ENEMY_AGGRO_RADIUS + 1,
        playerInSpawnRoom: true,
      }),
    ).toBe(false);
  });

  it('boss has slightly larger detection radius', () => {
    const dist = ENEMY_AGGRO_RADIUS + 10;
    expect(dist).toBeLessThan(BOSS_AGGRO_RADIUS);
    expect(
      shouldEnemyAggro({
        aggroed: false,
        enraged: false,
        isBoss: true,
        distToPlayer: dist,
        playerInSpawnRoom: true,
      }),
    ).toBe(true);
  });

  it('keeps chasing while player stays in leash range', () => {
    expect(
      shouldEnemyAggro({
        aggroed: true,
        enraged: false,
        isBoss: false,
        distToPlayer: ENEMY_LEASH_RADIUS - 10,
        playerInSpawnRoom: true,
      }),
    ).toBe(true);
  });

  it('drops aggro when player leaves room and is far', () => {
    expect(
      shouldEnemyAggro({
        aggroed: true,
        enraged: false,
        isBoss: false,
        distToPlayer: ENEMY_LEASH_RADIUS + 1,
        playerInSpawnRoom: false,
      }),
    ).toBe(false);
  });

  it('enraged enemies always chase', () => {
    expect(
      shouldEnemyAggro({
        aggroed: false,
        enraged: true,
        isBoss: false,
        distToPlayer: 999,
        playerInSpawnRoom: false,
      }),
    ).toBe(true);
  });
});
