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
  const tip = length;
  const base = length * 0.55;
  g.moveTo(base, 0)
    .lineTo(tip, 0)
    .stroke({ width: 2, color: 0xffffff, alpha, cap: 'round' });
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
  g.roundRect(-1.5, -2, 3, 14, 1).fill(0x8a5a30);
  g.moveTo(0, -14)
    .lineTo(-4, -4)
    .lineTo(4, -4)
    .closePath()
    .fill(color);
  g.circle(0, 4, 2.5).fill({ color: 0xc4f082, alpha: 0.8 });
}

export function drawSporeOrb(g: Graphics, color: number): void {
  g.circle(0, 0, 5).fill({ color, alpha: 0.9 });
  g.circle(-2, -2, 2).fill({ color: 0xffffff, alpha: 0.5 });
}

export function drawEnergyOrb(g: Graphics, color: number): void {
  g.circle(0, 0, 5).fill({ color, alpha: 0.95 });
  g.circle(0, 0, 7).stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 });
}
