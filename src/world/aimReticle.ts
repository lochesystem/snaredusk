import { Graphics } from 'pixi.js';

const RETICLE_ARM = 4;
const RETICLE_COLOR = 0xff4444;
const RETICLE_ALPHA = 0.9;

/** Ângulo da mira (radianos) do jogador em direção ao alvo. */
export function calcAimAngle(
  playerX: number,
  playerY: number,
  targetX: number,
  targetY: number,
  fallbackAngle = 0,
): number {
  const dx = targetX - playerX;
  const dy = targetY - playerY;
  if (Math.hypot(dx, dy) < 1) return fallbackAngle;
  return Math.atan2(dy, dx);
}

/** Ponto na borda do alcance da arma, na direção da mira. */
export function calcAimReticlePosition(
  playerX: number,
  playerY: number,
  angle: number,
  range: number,
): { x: number; y: number } {
  return {
    x: playerX + Math.cos(angle) * range,
    y: playerY + Math.sin(angle) * range,
  };
}

export function createAimReticle(): Graphics {
  const gfx = new Graphics();
  gfx.eventMode = 'none';
  gfx.visible = false;
  return gfx;
}

export function drawAimReticle(gfx: Graphics, x: number, y: number): void {
  gfx.clear();
  gfx.moveTo(x - RETICLE_ARM, y);
  gfx.lineTo(x + RETICLE_ARM, y);
  gfx.moveTo(x, y - RETICLE_ARM);
  gfx.lineTo(x, y + RETICLE_ARM);
  gfx.stroke({ width: 1.5, color: RETICLE_COLOR, alpha: RETICLE_ALPHA });
}
