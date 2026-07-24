import { Container, Graphics } from 'pixi.js';
import {
  drawKnifeSlashArc,
  drawKnifeSlashLine,
  drawSpearAlongX,
} from './graphicsPaths.ts';

export type AttackFxStyle = 'knife' | 'pickaxe' | 'spear_thrust';

export interface WeaponAttackFxState {
  root: Container;
  life: number;
  duration: number;
  style: AttackFxStyle;
  angle: number;
  range: number;
  color: number;
  blades?: Graphics[];
  slash?: Graphics;
  pickaxe?: Graphics;
  sparks?: Graphics;
  spear?: Graphics;
  spearTrail?: Graphics;
}

const FX_DURATIONS: Record<AttackFxStyle, number> = {
  knife: 0.11,
  pickaxe: 0.18,
  spear_thrust: 0.09,
};

/** Parâmetros compartilhados entre animação e hitbox melee. */
export const MELEE_SWEEP = {
  knife: {
    /** Recuo antes do golpe (relativo à mira). */
    startOffset: -0.48,
    /** Pequeno follow-through após a mira (hitbox). */
    endOffset: 0.08,
    lengthScale: 0.9,
    innerRadius: 4,
    anglePadding: 0.18,
    reachPadding: 6,
  },
  pickaxe: {
    startOffset: -1.35,
    endOffset: 0.15,
    lengthScale: 0.82,
    innerRadius: 4,
    anglePadding: 0.32,
    reachPadding: 16,
  },
} as const;

export type MeleeSweepStyle = keyof typeof MELEE_SWEEP;

const ENEMY_HIT_RADIUS = 10;

function isAngleInSweep(targetA: number, startA: number, endA: number, padding: number): boolean {
  let a = targetA;
  while (a < startA - Math.PI) a += Math.PI * 2;
  while (a > endA + Math.PI) a -= Math.PI * 2;
  return a >= startA - padding && a <= endA + padding;
}

function angleDistance(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

/** Hitbox alinhada ao arco/varredura da animação melee. */
export function isTargetInMeleeSweep(
  originX: number,
  originY: number,
  aimAngle: number,
  targetX: number,
  targetY: number,
  style: MeleeSweepStyle,
  range: number,
  targetRadius = ENEMY_HIT_RADIUS,
  arcAngle?: number,
): boolean {
  const sweep = MELEE_SWEEP[style];
  const startA = aimAngle + sweep.startOffset;
  const endA = aimAngle + sweep.endOffset;
  const bladeReach = range * sweep.lengthScale + sweep.reachPadding;
  const outerR = bladeReach + targetRadius;
  const innerR = Math.max(0, sweep.innerRadius - targetRadius);

  const dx = targetX - originX;
  const dy = targetY - originY;
  const dist = Math.hypot(dx, dy);
  if (dist > outerR) return false;
  if (dist < innerR) return false;

  const targetA = Math.atan2(dy, dx);
  const intersectsAnimatedSweep = isAngleInSweep(
    targetA,
    startA,
    endA,
    sweep.anglePadding,
  );
  if (intersectsAnimatedSweep) return true;

  if (arcAngle === undefined) return false;

  // O raio corporal conta como parte do alvo. Isso deixa o combate corpo a
  // corpo tolerante quando o inimigo está colado ao jogador, sem permitir
  // que um golpe acerte criaturas realmente atrás dele.
  const targetAngularRadius = dist > 0
    ? Math.asin(Math.min(1, targetRadius / dist))
    : Math.PI / 2;
  const bodyPadding = Math.min(0.42, targetAngularRadius);
  return angleDistance(targetA, aimAngle) <= arcAngle / 2 + bodyPadding;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function getAttackFxDuration(style: AttackFxStyle): number {
  return FX_DURATIONS[style];
}

function buildKnifeFx(root: Container, range: number, color: number): {
  blades: Graphics[];
  slash: Graphics;
} {
  const bladeLen = range * MELEE_SWEEP.knife.lengthScale;
  const blades: Graphics[] = [];
  const trailAlphas = [0.95, 0.16, 0.1];

  for (let i = 0; i < 3; i++) {
    const blade = new Graphics();
    drawKnifeSlashArc(blade, bladeLen - i * 3, color, trailAlphas[i]!);
    root.addChild(blade);
    blades.push(blade);
  }

  const slash = new Graphics();
  drawKnifeSlashLine(slash, bladeLen * 0.72, 0.55);
  root.addChild(slash);

  return { blades, slash };
}

function buildPickaxeFx(root: Container, range: number, color: number): {
  pickaxe: Graphics;
  sparks: Graphics;
} {
  const pickaxe = new Graphics();
  drawKnifeSlashArc(pickaxe, range * MELEE_SWEEP.pickaxe.lengthScale, color, 0.48);
  root.addChild(pickaxe);

  const sparks = new Graphics();
  sparks.visible = false;
  root.addChild(sparks);

  return { pickaxe, sparks };
}

function buildSpearFx(root: Container, color: number): {
  spear: Graphics;
  spearTrail: Graphics;
} {
  const spear = new Graphics();
  drawSpearAlongX(spear, 16, color);
  root.addChild(spear);

  const spearTrail = new Graphics();
  spearTrail.visible = false;
  root.addChild(spearTrail);

  return { spear, spearTrail };
}

export function createWeaponAttackFx(
  style: AttackFxStyle,
  angle: number,
  range: number,
  color: number,
): WeaponAttackFxState {
  const duration = FX_DURATIONS[style];
  const root = new Container();
  const state: WeaponAttackFxState = {
    root,
    life: duration,
    duration,
    style,
    angle,
    range,
    color,
  };

  if (style === 'knife') {
    const parts = buildKnifeFx(root, range, color);
    state.blades = parts.blades;
    state.slash = parts.slash;
    root.rotation = angle;
  } else if (style === 'pickaxe') {
    const parts = buildPickaxeFx(root, range, color);
    state.pickaxe = parts.pickaxe;
    state.sparks = parts.sparks;
    root.rotation = angle;
  } else {
    const parts = buildSpearFx(root, color);
    state.spear = parts.spear;
    state.spearTrail = parts.spearTrail;
    root.rotation = angle;
  }

  return state;
}

function updateKnifeFx(fx: WeaponAttackFxState, t: number): void {
  const sweep = easeOutCubic(t);
  const { startOffset } = MELEE_SWEEP.knife;
  const relStart = startOffset;
  const relEnd = 0;
  const curRel = relStart + (relEnd - relStart) * sweep;
  const trailDelays = [0, 0.14, 0.28];
  const trailAlphas = [0.95, 0.18, 0.1];

  fx.blades?.forEach((blade, i) => {
    const trailT = Math.max(0, sweep - trailDelays[i]!);
    blade.rotation = relStart + (relEnd - relStart) * trailT;
    blade.alpha = trailAlphas[i]!;
  });

  if (fx.slash) {
    fx.slash.rotation = curRel;
    fx.slash.alpha = 0.55 - t * 0.35;
  }
}

function updatePickaxeFx(fx: WeaponAttackFxState, t: number): void {
  const swing = easeInOutQuad(t);
  const { startOffset, endOffset, lengthScale } = MELEE_SWEEP.pickaxe;
  const relStart = startOffset;
  const relEnd = endOffset;
  const curA = relStart + (relEnd - relStart) * swing;
  const handleLen = fx.range * lengthScale;

  if (fx.pickaxe) {
    fx.pickaxe.rotation = curA;
  }

  if (fx.sparks) {
    if (t <= 0.68) {
      fx.sparks.visible = false;
      return;
    }
    fx.sparks.visible = true;
    fx.sparks.clear();
    const impactT = (t - 0.68) / 0.32;
    const ix = Math.cos(curA) * handleLen;
    const iy = Math.sin(curA) * handleLen;
    for (let i = 0; i < 2; i++) {
      const rayA = curA - 0.55 + i * 1.1;
      const rayLen = 3 + impactT * 3;
      fx.sparks
        .moveTo(ix, iy)
        .lineTo(ix + Math.cos(rayA) * rayLen, iy + Math.sin(rayA) * rayLen)
        .stroke({ width: 1, color: 0xf0e6d3, alpha: 0.5 * (1 - impactT), cap: 'round' });
    }
  }
}

function updateSpearFx(fx: WeaponAttackFxState, t: number): void {
  const thrust = easeOutCubic(t);
  const extend = fx.range * 0.22 * Math.sin(thrust * Math.PI);
  const shaftLen = 16 + extend;

  if (fx.spear) {
    fx.spear.scale.set(shaftLen / 16, 1);
  }

  if (fx.spearTrail) {
    if (thrust <= 0.35) {
      fx.spearTrail.visible = false;
      return;
    }
    fx.spearTrail.visible = true;
    fx.spearTrail.clear();
    const back = 8 * (thrust - 0.35);
    fx.spearTrail
      .moveTo(6 - back, 0)
      .lineTo(6, 0)
      .stroke({ width: 2, color: fx.color, alpha: 0.35 * (1 - thrust), cap: 'round' });
  }
}

export function tickWeaponAttackFx(
  fx: WeaponAttackFxState,
  dt: number,
  x: number,
  y: number,
): boolean {
  fx.life -= dt;
  if (fx.life <= 0) return false;

  const t = 1 - fx.life / fx.duration;
  fx.root.x = x;
  fx.root.y = y;

  if (fx.style === 'knife') updateKnifeFx(fx, t);
  else if (fx.style === 'pickaxe') updatePickaxeFx(fx, t);
  else updateSpearFx(fx, t);

  return true;
}
