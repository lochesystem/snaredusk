import type { BiomeId } from '../data/biomes.ts';
import { type DoorDir } from '../world/dungeonGenerator.ts';
import { distance } from './combat.ts';

export type BossFightPhase = 'locked' | 'intro' | 'active' | 'done';

/** Pixels dentro da sala após o portão/murinho para iniciar o chefe. */
export const BOSS_GATE_INNER_CLEARANCE = 22;

export interface BossMechanicEnemy {
  speciesId: string;
  isBoss: boolean;
  dead: boolean;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  mechanicCd: number;
}

export interface BossMechanicContext {
  playerX: number;
  playerY: number;
  dt: number;
  biomeId: BiomeId;
  bossFightActive: boolean;
}

export interface BossSummonRequest {
  speciesId: string;
  x: number;
  y: number;
  roomIndex: number;
}

export interface BossMechanicResult {
  summons: BossSummonRequest[];
  slamDamage: number;
  heatWaveDamage: number;
}

const MINION_BY_BIOME: Record<BiomeId, string> = {
  floresta: 'esporo_dorminhoco',
  cristal: 'eco_quartzo',
  termal: 'vaporoso',
};

export function initBossMechanicCd(): number {
  return 2.5;
}

export function isPointInsideRoom(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number },
  margin = 6,
): boolean {
  return (
    x >= rect.x + margin &&
    x <= rect.x + rect.width - margin &&
    y >= rect.y + margin &&
    y <= rect.y + rect.height - margin
  );
}

/** @deprecated use isPastBossGates with room rect */
export function isClearOfRoomDoors(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number },
  doors: DoorDir[],
  guard: number,
): boolean {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const half = 26;

  for (const door of doors) {
    if (door === 'n' && y < rect.y + guard) return false;
    if (door === 's' && y > rect.y + rect.height - guard) return false;
    if (door === 'w' && x < rect.x + guard) return false;
    if (door === 'e' && x > rect.x + rect.width - guard) return false;
    if (door === 'n' && Math.abs(x - cx) < half) return false;
    if (door === 's' && Math.abs(x - cx) < half) return false;
    if (door === 'w' && Math.abs(y - cy) < half) return false;
    if (door === 'e' && Math.abs(y - cy) < half) return false;
  }
  return true;
}

/**
 * Jogador passou do portão verde e do murinho — basta alguns passos dentro da sala.
 * Se não está na faixa de nenhum portão, já está no interior.
 */
export function isPastBossGates(
  x: number,
  y: number,
  gateWalls: { x: number; y: number; width: number; height: number }[],
  roomRect: { x: number; y: number; width: number; height: number },
  clearance = BOSS_GATE_INNER_CLEARANCE,
): boolean {
  if (gateWalls.length === 0) return true;

  const hallPad = 10;

  for (const gate of gateWalls) {
    const inHall =
      x >= gate.x - hallPad &&
      x <= gate.x + gate.width + hallPad &&
      y >= gate.y - hallPad &&
      y <= gate.y + gate.height + hallPad;
    if (!inHall) continue;

    const isVerticalSlab = gate.width < gate.height;
    if (isVerticalSlab) {
      const isWestGate = gate.x <= roomRect.x + 24;
      if (isWestGate) {
        if (x < gate.x + gate.width + clearance) return false;
      } else if (x > gate.x - clearance) {
        return false;
      }
    } else {
      const isNorthGate = gate.y <= roomRect.y + 24;
      if (isNorthGate) {
        if (y < gate.y + gate.height + clearance) return false;
      } else if (y > gate.y - clearance) {
        return false;
      }
    }
  }

  return true;
}

export interface BossArenaLayout {
  rect: { x: number; y: number; width: number; height: number };
  doors: DoorDir[];
}

export function shouldStartBossIntro(input: {
  playerX: number;
  playerY: number;
  room: BossArenaLayout;
  gateWalls: { x: number; y: number; width: number; height: number }[];
  gateOpened: boolean;
  gateClosed: boolean;
  hasKey: boolean;
}): boolean {
  if (!input.hasKey) return false;
  if (!input.gateOpened || input.gateClosed) return false;
  if (!isPointInsideRoom(input.playerX, input.playerY, input.room.rect)) return false;
  if (!isPastBossGates(input.playerX, input.playerY, input.gateWalls, input.room.rect)) {
    return false;
  }
  return true;
}

/** Entidade está dentro da arena do chefe (passou dos portões se estiverem fechados). */
export function isEntityInBossArena(
  x: number,
  y: number,
  room: BossArenaLayout,
  gateWalls: { x: number; y: number; width: number; height: number }[],
  gateClosed: boolean,
): boolean {
  if (!isPointInsideRoom(x, y, room.rect)) return false;
  if (!gateClosed || gateWalls.length === 0) return true;
  return isPastBossGates(x, y, gateWalls, room.rect);
}

export function tickBossMechanics(
  enemy: BossMechanicEnemy,
  ctx: BossMechanicContext,
  roomIndex: number,
): BossMechanicResult {
  const result: BossMechanicResult = { summons: [], slamDamage: 0, heatWaveDamage: 0 };
  if (!enemy.isBoss || enemy.dead || !ctx.bossFightActive) return result;

  enemy.mechanicCd -= ctx.dt;

  if (enemy.speciesId === 'rei_esporas' && enemy.mechanicCd <= 0) {
    enemy.mechanicCd = 7;
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 30;
    result.summons.push({
      speciesId: MINION_BY_BIOME.floresta,
      x: enemy.x + Math.cos(angle) * dist,
      y: enemy.y + Math.sin(angle) * dist,
      roomIndex,
    });
  }

  if (enemy.speciesId === 'salamandra_ancia' && enemy.mechanicCd <= 0) {
    const dist = distance(enemy.x, enemy.y, ctx.playerX, ctx.playerY);
    if (dist < 90) {
      enemy.mechanicCd = 5.5;
      result.heatWaveDamage = 8;
    } else {
      enemy.mechanicCd = 1.5;
    }
  }

  if (enemy.speciesId === 'matriarca_prismatica' && enemy.hp / enemy.maxHp < 0.45 && enemy.mechanicCd <= 0) {
    enemy.mechanicCd = 4;
    const angle = Math.random() * Math.PI * 2;
    result.summons.push({
      speciesId: MINION_BY_BIOME.cristal,
      x: enemy.x + Math.cos(angle) * 50,
      y: enemy.y + Math.sin(angle) * 50,
      roomIndex,
    });
  }

  return result;
}

export function isNearBossGate(
  playerX: number,
  playerY: number,
  gateWalls: { x: number; y: number; width: number; height: number }[],
  margin = 36,
): boolean {
  for (const gate of gateWalls) {
    const cx = gate.x + gate.width / 2;
    const cy = gate.y + gate.height / 2;
    if (distance(playerX, playerY, cx, cy) < margin + Math.max(gate.width, gate.height) / 2) {
      return true;
    }
  }
  return false;
}
