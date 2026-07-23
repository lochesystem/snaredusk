export interface EnemyHitboxProfile {
  /** Área atingível por armas e projéteis. */
  hitRadius: number;
  /** Desloca o centro atingível do ponto dos pés para o centro visual. */
  hitOffsetY: number;
  /** Corpo usado contra paredes/obstáculos; menor que a silhueta visual. */
  collisionRadius: number;
  /** Altura da barra local em relação ao ponto dos pés. */
  statusBarY: number;
}

const DEFAULT_ENEMY_HITBOX: EnemyHitboxProfile = {
  hitRadius: 10,
  hitOffsetY: 0,
  collisionRadius: 9,
  statusBarY: -22,
};

const ENEMY_HITBOXES: Record<string, EnemyHitboxProfile> = {
  esporo_dorminhoco: { hitRadius: 21, hitOffsetY: -18, collisionRadius: 14, statusBarY: -42 },
  lumimorcego: { hitRadius: 25, hitOffsetY: -25, collisionRadius: 14, statusBarY: -52 },
  carapaca_musgo: { hitRadius: 29, hitOffsetY: -25, collisionRadius: 22, statusBarY: -53 },
  prismarin: { hitRadius: 25, hitOffsetY: -34, collisionRadius: 14, statusBarY: -50 },
  lumicascalho: { hitRadius: 26, hitOffsetY: -29, collisionRadius: 19, statusBarY: -49 },
  eco_quartzo: { hitRadius: 28, hitOffsetY: -36, collisionRadius: 20, statusBarY: -53 },
  matriarca_prismatica: { hitRadius: 44, hitOffsetY: -52, collisionRadius: 30, statusBarY: -86 },
  salamandra: { hitRadius: 27, hitOffsetY: -17, collisionRadius: 20, statusBarY: -36 },
  vaporoso: { hitRadius: 28, hitOffsetY: -31, collisionRadius: 18, statusBarY: -62 },
  caranguejo_termal: { hitRadius: 30, hitOffsetY: -26, collisionRadius: 22, statusBarY: -50 },
  salamandra_ancia: { hitRadius: 43, hitOffsetY: -38, collisionRadius: 31, statusBarY: -78 },
};

export function getEnemyHitbox(speciesId: string): EnemyHitboxProfile {
  return ENEMY_HITBOXES[speciesId] ?? DEFAULT_ENEMY_HITBOX;
}
