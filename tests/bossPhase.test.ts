import { describe, expect, it } from 'vitest';
import { getEnemyBehavior } from '../src/data/enemyBehaviors.ts';
import {
  calcBossHpBarFills,
  enterBossPhase2,
  getBossPhaseModifiers,
  shouldEnterBossPhase2,
} from '../src/systems/bossPhase.ts';

function makeBoss(speciesId: string, hp: number, maxHp: number) {
  return {
    isBoss: true,
    speciesId,
    hp,
    maxHp,
    bossCombatPhase: 1 as const,
    enraged: false,
  };
}

describe('bossPhase', () => {
  it('shouldEnterBossPhase2 at 50% HP', () => {
    expect(shouldEnterBossPhase2(61, 120)).toBe(false);
    expect(shouldEnterBossPhase2(60, 120)).toBe(true);
    expect(shouldEnterBossPhase2(30, 120)).toBe(true);
  });

  it('enterBossPhase2 is idempotent and sets enraged', () => {
    const boss = makeBoss('rei_esporas', 50, 120);
    expect(enterBossPhase2(boss)).toBe(true);
    expect(boss.bossCombatPhase).toBe(2);
    expect(boss.enraged).toBe(true);
    expect(enterBossPhase2(boss)).toBe(false);
  });

  it('getBossPhaseModifiers escalates per boss', () => {
    const rei = makeBoss('rei_esporas', 50, 120);
    enterBossPhase2(rei);
    const reiMods = getBossPhaseModifiers(rei, getEnemyBehavior('boss_spore'));
    expect(reiMods.attackCooldownMult).toBe(0.7);
    expect(reiMods.burstCountBonus).toBe(1);
    expect(reiMods.summonCount).toBe(2);

    const mat = makeBoss('matriarca_prismatica', 60, 140);
    enterBossPhase2(mat);
    const matMods = getBossPhaseModifiers(mat, getEnemyBehavior('boss_prism'));
    expect(matMods.reflectWithoutShield).toBe(true);
    expect(matMods.mechanicCdMult).toBe(0.65);

    const sal = makeBoss('salamandra_ancia', 70, 160);
    enterBossPhase2(sal);
    const salMods = getBossPhaseModifiers(sal, getEnemyBehavior('boss_thermal'));
    expect(salMods.heatWaveCd).toBe(3.2);
    expect(salMods.leapIntervalMult).toBe(0.7);
  });

  it('calcBossHpBarFills splits at 50%', () => {
    expect(calcBossHpBarFills(120, 120)).toEqual({ phase1: 1, phase2: 1 });
    expect(calcBossHpBarFills(90, 120)).toEqual({ phase1: 0.5, phase2: 1 });
    expect(calcBossHpBarFills(60, 120)).toEqual({ phase1: 0, phase2: 1 });
    expect(calcBossHpBarFills(30, 120)).toEqual({ phase1: 0, phase2: 0.5 });
    expect(calcBossHpBarFills(0, 120)).toEqual({ phase1: 0, phase2: 0 });
  });
});
