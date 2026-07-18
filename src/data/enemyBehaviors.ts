export type EnemyBehaviorKind =
  | 'melee'
  | 'ranged'
  | 'shielded'
  | 'boss_burst'
  | 'boss_spore'
  | 'boss_prism'
  | 'boss_thermal';

export interface EnemyBehaviorDef {
  id: string;
  kind: EnemyBehaviorKind;
  attackRange: number;
  attackCooldown: number;
  preferredRange?: number;
  projectileSpeed?: number;
  projectileDamageMult?: number;
  burstCount?: number;
  shieldHp?: number;
  shieldRegenDelay?: number;
  chargeSpeed?: number;
  chargeDuration?: number;
  leapInterval?: number;
}

export const ENEMY_BEHAVIORS: Record<string, EnemyBehaviorDef> = {
  melee: {
    id: 'melee',
    kind: 'melee',
    attackRange: 18,
    attackCooldown: 1.1,
  },
  ranged: {
    id: 'ranged',
    kind: 'ranged',
    attackRange: 140,
    attackCooldown: 2.0,
    preferredRange: 100,
    projectileSpeed: 150,
    projectileDamageMult: 1,
  },
  shielded: {
    id: 'shielded',
    kind: 'shielded',
    attackRange: 20,
    attackCooldown: 1.4,
    shieldHp: 30,
    shieldRegenDelay: 5,
  },
  boss_burst: {
    id: 'boss_burst',
    kind: 'boss_burst',
    attackRange: 160,
    attackCooldown: 2.5,
    preferredRange: 90,
    projectileSpeed: 130,
    projectileDamageMult: 0.85,
    burstCount: 3,
    shieldHp: 40,
    shieldRegenDelay: 8,
  },
  boss_spore: {
    id: 'boss_spore',
    kind: 'boss_spore',
    attackRange: 150,
    attackCooldown: 2.2,
    preferredRange: 85,
    projectileSpeed: 120,
    projectileDamageMult: 0.8,
    burstCount: 4,
    shieldHp: 35,
    shieldRegenDelay: 7,
    leapInterval: 5,
  },
  boss_prism: {
    id: 'boss_prism',
    kind: 'boss_prism',
    attackRange: 170,
    attackCooldown: 2.0,
    preferredRange: 95,
    projectileSpeed: 145,
    projectileDamageMult: 0.9,
    burstCount: 3,
    shieldHp: 45,
    shieldRegenDelay: 6,
  },
  boss_thermal: {
    id: 'boss_thermal',
    kind: 'boss_thermal',
    attackRange: 22,
    attackCooldown: 1.6,
    preferredRange: 55,
    chargeSpeed: 220,
    chargeDuration: 0.55,
    leapInterval: 4.5,
    shieldHp: 30,
    shieldRegenDelay: 9,
  },
};

export function getEnemyBehavior(id: string): EnemyBehaviorDef {
  return ENEMY_BEHAVIORS[id] ?? ENEMY_BEHAVIORS.melee!;
}

export function isBossBehaviorKind(kind: EnemyBehaviorKind): boolean {
  return kind === 'boss_burst' || kind === 'boss_spore' || kind === 'boss_prism' || kind === 'boss_thermal';
}

export function isRangedBossKind(kind: EnemyBehaviorKind): boolean {
  return kind === 'boss_burst' || kind === 'boss_spore' || kind === 'boss_prism';
}
