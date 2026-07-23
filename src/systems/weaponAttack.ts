import type { WeaponDef } from '../data/weapons.ts';
import { isTargetInMeleeSweep, type MeleeSweepStyle } from '../world/weaponAttackFx.ts';
import { createProjectileData } from './projectiles.ts';

export interface MeleeTarget {
  id: string;
  x: number;
  y: number;
  def: number;
  dead: boolean;
  fled: boolean;
  captureLocked: boolean;
  hitRadius?: number;
  hitOffsetY?: number;
}

export function findMeleeHits(
  playerX: number,
  playerY: number,
  aimAngle: number,
  weapon: WeaponDef,
  targets: MeleeTarget[],
): { id: string; damage: number }[] {
  if (weapon.kind !== 'melee') return [];
  const style: MeleeSweepStyle = weapon.attackFx === 'pickaxe' ? 'pickaxe' : 'knife';
  const hits: { id: string; damage: number }[] = [];

  for (const t of targets) {
    if (t.dead || t.fled || t.captureLocked) continue;
    if (!isTargetInMeleeSweep(
      playerX,
      playerY - 4,
      aimAngle,
      t.x,
      t.y + (t.hitOffsetY ?? 0),
      style,
      weapon.range,
      t.hitRadius,
    )) {
      continue;
    }
    hits.push({ id: t.id, damage: weapon.atk });
  }
  return hits;
}

export function buildPlayerProjectile(
  playerX: number,
  playerY: number,
  aimAngle: number,
  weapon: WeaponDef,
) {
  return createProjectileData(
    playerX,
    playerY - 4,
    aimAngle,
    weapon.projectileSpeed ?? 200,
    weapon.atk,
    'player',
    weapon.range,
    weapon.pierce ?? 0,
    5,
  );
}
