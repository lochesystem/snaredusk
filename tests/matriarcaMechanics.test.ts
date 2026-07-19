import { describe, expect, it } from 'vitest';
import { tickBossMechanics, type BossMechanicEnemy } from '../src/systems/bossMechanics.ts';
import {
  createStalactiteTelegraph,
  tickStalactiteTelegraphs,
  STALACTITE_TELEGRAPH_SEC,
} from '../src/systems/stalactiteMechanic.ts';

function matriarca(overrides: Partial<BossMechanicEnemy> = {}): BossMechanicEnemy {
  return {
    speciesId: 'matriarca_prismatica',
    isBoss: true,
    dead: false,
    hp: 100,
    maxHp: 140,
    x: 200,
    y: 200,
    mechanicCd: 0,
    summonCd: 0,
    bossCombatPhase: 2,
    behaviorId: 'boss_prism',
    enraged: false,
    ...overrides,
  };
}

describe('matriarca boss mechanics', () => {
  it('fires stalactite at player position on cooldown', () => {
    const enemy = matriarca({ mechanicCd: 0 });
    const result = tickBossMechanics(
      enemy,
      {
        playerX: 120,
        playerY: 160,
        dt: 0,
        biomeId: 'cristal',
        bossFightActive: true,
        livingMatriarcaMinions: 0,
      },
      5,
    );
    expect(result.stalactites).toHaveLength(1);
    expect(result.stalactites[0]?.x).toBe(120);
    expect(enemy.mechanicCd).toBeGreaterThan(0);
  });

  it('summons only when fewer than 2 minions are alive', () => {
    const ready = matriarca({ summonCd: 0, mechanicCd: 5 });
    const withMinions = tickBossMechanics(
      ready,
      {
        playerX: 120,
        playerY: 160,
        dt: 0,
        biomeId: 'cristal',
        bossFightActive: true,
        livingMatriarcaMinions: 2,
      },
      5,
    );
    expect(withMinions.summons).toHaveLength(0);

    const needsSummon = matriarca({ summonCd: 0, mechanicCd: 5 });
    const spawned = tickBossMechanics(
      needsSummon,
      {
        playerX: 120,
        playerY: 160,
        dt: 0,
        biomeId: 'cristal',
        bossFightActive: true,
        livingMatriarcaMinions: 1,
      },
      5,
    );
    expect(spawned.summons).toHaveLength(1);
  });
});

describe('stalactiteMechanic', () => {
  it('impacts after telegraph expires', () => {
    const tele = createStalactiteTelegraph({
      x: 50,
      y: 50,
      radius: 16,
      damage: 14,
      roomIndex: 1,
    });
    const mid = tickStalactiteTelegraphs([tele], STALACTITE_TELEGRAPH_SEC * 0.5);
    expect(mid.impacts).toHaveLength(0);
    expect(mid.remaining).toHaveLength(1);

    const end = tickStalactiteTelegraphs(mid.remaining, STALACTITE_TELEGRAPH_SEC);
    expect(end.impacts).toHaveLength(1);
    expect(end.remaining).toHaveLength(0);
  });
});
