import type { EnemyBehaviorDef } from '../data/enemyBehaviors.ts';

export type BossCombatPhase = 1 | 2;

export interface BossPhaseEnemy {
  isBoss: boolean;
  speciesId: string;
  hp: number;
  maxHp: number;
  bossCombatPhase: BossCombatPhase;
  enraged: boolean;
}

export interface BossPhaseModifiers {
  attackCooldownMult: number;
  speedMult: number;
  burstCountBonus: number;
  mechanicCdMult: number;
  heatWaveCd: number;
  chargeDurationMult: number;
  leapIntervalMult: number;
  summonCount: number;
  reflectWithoutShield: boolean;
}

const DEFAULT_MODIFIERS: BossPhaseModifiers = {
  attackCooldownMult: 1,
  speedMult: 1,
  burstCountBonus: 0,
  mechanicCdMult: 1,
  heatWaveCd: 5.5,
  chargeDurationMult: 1,
  leapIntervalMult: 1,
  summonCount: 1,
  reflectWithoutShield: false,
};

export function shouldEnterBossPhase2(hp: number, maxHp: number): boolean {
  if (maxHp <= 0) return false;
  return hp / maxHp <= 0.5;
}

export function enterBossPhase2(enemy: BossPhaseEnemy): boolean {
  if (!enemy.isBoss || enemy.bossCombatPhase === 2) return false;
  enemy.bossCombatPhase = 2;
  enemy.enraged = true;
  return true;
}

export function getBossPhaseModifiers(
  enemy: BossPhaseEnemy,
  _behavior: EnemyBehaviorDef,
): BossPhaseModifiers {
  if (!enemy.isBoss || enemy.bossCombatPhase < 2) {
    return { ...DEFAULT_MODIFIERS };
  }

  switch (enemy.speciesId) {
    case 'rei_esporas':
      return {
        ...DEFAULT_MODIFIERS,
        attackCooldownMult: 0.7,
        speedMult: 1.1,
        burstCountBonus: 1,
        mechanicCdMult: 0.85,
        summonCount: 2,
      };
    case 'matriarca_prismatica':
      return {
        ...DEFAULT_MODIFIERS,
        attackCooldownMult: 0.75,
        speedMult: 1.15,
        mechanicCdMult: 0.65,
        summonCount: 1,
        reflectWithoutShield: true,
      };
    case 'salamandra_ancia':
      return {
        ...DEFAULT_MODIFIERS,
        attackCooldownMult: 0.72,
        speedMult: 1.2,
        heatWaveCd: 3.2,
        chargeDurationMult: 0.75,
        leapIntervalMult: 0.7,
      };
    default:
      return {
        ...DEFAULT_MODIFIERS,
        attackCooldownMult: 0.8,
        speedMult: 1.15,
      };
  }
}

export function calcBossHpBarFills(hp: number, maxHp: number): { phase1: number; phase2: number } {
  if (maxHp <= 0) return { phase1: 0, phase2: 0 };
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  if (ratio > 0.5) {
    return { phase1: (ratio - 0.5) / 0.5, phase2: 1 };
  }
  return { phase1: 0, phase2: ratio / 0.5 };
}
