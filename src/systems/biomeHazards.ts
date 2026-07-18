import type { BiomeHazardKind } from '../data/biomes.ts';
import type { DungeonHazard } from '../world/dungeonGenerator.ts';
import { distance } from './combat.ts';

/** Velocidade máxima no gelo — um pouco acima do movimento normal. */
export const SLIP_MAX_SPEED = 158;
/** Aceleração ao segurar direção (px/s²). */
export const SLIP_ACCEL = 500;
/** Desaceleração ao soltar as teclas (px/s²) — desliza antes de parar. */
export const SLIP_DECEL = 88;

export const POISON_TICK_INTERVAL = 0.55;
export const POISON_DAMAGE = 3;
export const SPORE_TICK_INTERVAL = 1.2;
export const SPORE_DAMAGE = 2;

export function getBiomeHazardClass(kind: BiomeHazardKind | null): string | null {
  if (kind === 'spores') return 'biome-hazard-spores';
  if (kind === 'slippery') return 'biome-hazard-slippery';
  if (kind === 'poison') return 'biome-hazard-poison';
  return null;
}

export function applySlipVelocity(
  slideX: number,
  slideY: number,
  inputX: number,
  inputY: number,
  dt: number,
): { x: number; y: number } {
  let vx = slideX;
  let vy = slideY;
  const hasInput = inputX !== 0 || inputY !== 0;

  if (hasInput) {
    vx += inputX * SLIP_ACCEL * dt;
    vy += inputY * SLIP_ACCEL * dt;
  }

  const speed = Math.hypot(vx, vy);
  if (speed > 0) {
    const decel = (hasInput ? 18 : SLIP_DECEL) * dt;
    const nextSpeed = Math.max(0, speed - decel);
    const scale = nextSpeed / speed;
    vx *= scale;
    vy *= scale;
  }

  const mag = Math.hypot(vx, vy);
  if (mag > SLIP_MAX_SPEED) {
    vx = (vx / mag) * SLIP_MAX_SPEED;
    vy = (vy / mag) * SLIP_MAX_SPEED;
  }

  return { x: vx, y: vy };
}

export function tickPoisonHazard(
  playerX: number,
  playerY: number,
  hazards: DungeonHazard[],
  timer: number,
  dt: number,
): { timer: number; damage: number } {
  let nextTimer = timer - dt;
  let damage = 0;
  const inPoison = hazards.some(
    (h) => h.kind === 'poison' && distance(playerX, playerY, h.x, h.y) < h.radius,
  );
  if (inPoison && nextTimer <= 0) {
    damage = POISON_DAMAGE;
    nextTimer = POISON_TICK_INTERVAL;
  }
  if (!inPoison && nextTimer < 0) nextTimer = 0;
  return { timer: nextTimer, damage };
}

export function tickSporeHazard(
  playerX: number,
  playerY: number,
  hazards: DungeonHazard[],
  timer: number,
  dt: number,
): { timer: number; damage: number } {
  let nextTimer = timer - dt;
  let damage = 0;
  const inSpore = hazards.some(
    (h) => h.kind === 'spore' && distance(playerX, playerY, h.x, h.y) < h.radius,
  );
  if (inSpore && nextTimer <= 0) {
    damage = SPORE_DAMAGE;
    nextTimer = SPORE_TICK_INTERVAL;
  }
  if (!inSpore && nextTimer < 0) nextTimer = 0;
  return { timer: nextTimer, damage };
}
