/** Raio em que o inimigo detecta o jogador (mesma sala). */
export const ENEMY_AGGRO_RADIUS = 80;
/** Chefe tem alcance um pouco maior, mas ainda local. */
export const BOSS_AGGRO_RADIUS = 108;
/** Após aggro, perde o alvo se o jogador fugir além disso. */
export const ENEMY_LEASH_RADIUS = 128;

export interface EnemyAggroInput {
  aggroed: boolean;
  enraged: boolean;
  isBoss: boolean;
  distToPlayer: number;
  playerInSpawnRoom: boolean;
}

export function shouldEnemyAggro(input: EnemyAggroInput): boolean {
  if (input.enraged) return true;

  const detectRadius = input.isBoss ? BOSS_AGGRO_RADIUS : ENEMY_AGGRO_RADIUS;

  if (!input.aggroed) {
    return input.playerInSpawnRoom && input.distToPlayer <= detectRadius;
  }

  if (!input.playerInSpawnRoom && input.distToPlayer > ENEMY_LEASH_RADIUS) {
    return false;
  }

  if (input.distToPlayer > ENEMY_LEASH_RADIUS * 1.15) {
    return false;
  }

  return true;
}
