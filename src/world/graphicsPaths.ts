import { Graphics, GraphicsPath } from 'pixi.js';

/** Lâmina no eixo +X (ponta em x = length). */
export function knifeBladePath(length: number): GraphicsPath {
  const base = length * 0.38;
  return new GraphicsPath()
    .moveTo(length, 0)
    .lineTo(base, 3)
    .lineTo(base, -3)
    .closePath();
}

export function drawKnifeBlade(
  g: Graphics,
  length: number,
  color: number,
  alpha: number,
): void {
  const path = knifeBladePath(length);
  g.path(path).fill({ color, alpha });
  g.path(path).stroke({ width: 1, color: 0x8a6a48, alpha: alpha * 0.9 });
  g.moveTo(length * 0.85, -1)
    .lineTo(length * 0.42, -1.5)
    .stroke({ width: 0.8, color: 0xffffff, alpha: alpha * 0.45, cap: 'round' });
}

export function drawKnifeSlashLine(g: Graphics, length: number, alpha: number): void {
  g.arc(0, 0, length, -0.68, 0.18)
    .stroke({ width: 3, color: 0xf8f1da, alpha, cap: 'round' });
  g.arc(0, 0, Math.max(2, length - 4), -0.62, 0.12)
    .stroke({ width: 1.5, color: 0xc9e7c2, alpha: alpha * 0.55, cap: 'round' });
}

export function drawKnifeSlashArc(
  g: Graphics,
  radius: number,
  color: number,
  alpha: number,
): void {
  g.arc(0, 0, radius, -0.72, 0.2)
    .stroke({ width: 2.5, color, alpha, cap: 'round' });
}

/** Picareta no eixo +X — cabo até handleLen, cabeça na ponta. */
export function drawPickaxeHead(
  g: Graphics,
  handleLen: number,
  headColor: number,
  alpha = 1,
): void {
  g.moveTo(0, 0)
    .lineTo(handleLen, 0)
    .stroke({ width: 3.5, color: 0x8a5a30, alpha, cap: 'round' });
  g.moveTo(handleLen, -11)
    .lineTo(handleLen, 11)
    .stroke({ width: 5, color: headColor, alpha, cap: 'round' });
  g.moveTo(handleLen, 0)
    .lineTo(handleLen, -9)
    .stroke({ width: 4, color: 0xc4a040, alpha, cap: 'round' });
}

export function drawSpearAlongX(g: Graphics, shaftLen: number, headColor: number, alpha = 1): void {
  g.roundRect(6, -2, shaftLen * 0.55, 4, 1).fill({ color: 0x8a5a30, alpha });
  const mid = 6 + shaftLen * 0.55;
  g.moveTo(6 + shaftLen, 0)
    .lineTo(mid, -4)
    .lineTo(mid, 4)
    .closePath()
    .fill({ color: headColor, alpha });
  g.moveTo(6 + shaftLen, 0)
    .lineTo(mid, -4)
    .lineTo(mid, 4)
    .closePath()
    .stroke({ width: 1, color: 0xe8f8c8, alpha: alpha * 0.6 });
}

export function drawSpearProjectile(g: Graphics, color: number): void {
  g.roundRect(-1.5, -4, 3, 19, 1).fill(0x6f4328);
  g.moveTo(0, -17)
    .lineTo(-5, -5)
    .lineTo(5, -5)
    .closePath()
    .fill(color);
  g.moveTo(0, -17)
    .lineTo(-2, -7)
    .stroke({ width: 1, color: 0xf1ffd0, alpha: 0.8 });
  g.circle(0, 7, 2.5).fill({ color: 0xc4f082, alpha: 0.9 });
  g.circle(-1, 15, 2).fill({ color, alpha: 0.45 });
  g.circle(2, 20, 1.5).fill({ color, alpha: 0.28 });
  g.circle(-1, 24, 1).fill({ color: 0xf1ffd0, alpha: 0.2 });
}

export function drawSporeOrb(g: Graphics, color: number): void {
  g.circle(0, 0, 5).fill({ color, alpha: 0.9 });
  g.circle(-2, -2, 2).fill({ color: 0xffffff, alpha: 0.5 });
}

export function drawEnergyOrb(g: Graphics, color: number): void {
  g.circle(0, 0, 5).fill({ color, alpha: 0.95 });
  g.circle(0, 0, 7).stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 });
}
