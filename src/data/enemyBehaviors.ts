export type EnemyBehaviorKind = 'melee' | 'ranged' | 'shielded' | 'boss_burst';

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
};

export function getEnemyBehavior(id: string): EnemyBehaviorDef {
  return ENEMY_BEHAVIORS[id] ?? ENEMY_BEHAVIORS.melee!;
}
