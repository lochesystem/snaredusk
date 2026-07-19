import { describe, expect, it } from 'vitest';
import { getEnemyBehavior } from '../src/data/enemyBehaviors.ts';
import {
  applyShieldDamage,
  initEnemyCombatFields,
  tickEnemyCombat,
  type EnemyCombatEnemy,
} from '../src/systems/enemyCombat.ts';

function makeShieldedEnemy(shieldMax = 30): EnemyCombatEnemy {
  return {
    id: 'e1',
    speciesId: 'carapaca_musgo',
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    atk: 10,
    speed: 40,
    attackCd: 0,
    enraged: false,
    aggroed: true,
    dead: false,
    fled: false,
    captureLocked: false,
    isBoss: false,
    bossCombatPhase: 1,
    def: 5,
    behaviorId: 'shielded',
    ...initEnemyCombatFields('shielded'),
    shieldMax,
    shieldHp: shieldMax,
  };
}

describe('enemyCombat shields', () => {
  it('absorbs damage while shield is active', () => {
    const enemy = makeShieldedEnemy(30);
    const behavior = getEnemyBehavior('shielded');
    const remaining = applyShieldDamage(enemy, 20, behavior);
    expect(remaining).toBe(0);
    expect(enemy.shieldHp).toBe(10);
  });

  it('does not regenerate shield after it is broken', () => {
    const enemy = makeShieldedEnemy(20);
    const behavior = getEnemyBehavior('shielded');
    applyShieldDamage(enemy, 25, behavior);
    expect(enemy.shieldHp).toBe(0);

    for (let i = 0; i < 20; i++) {
      tickEnemyCombat(enemy, { playerX: 100, playerY: 0, dt: 1 });
    }

    expect(enemy.shieldHp).toBe(0);
  });
});
