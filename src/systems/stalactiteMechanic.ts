export const STALACTITE_TELEGRAPH_SEC = 0.85;
export const STALACTITE_COOLDOWN_SEC = 3;
export const STALACTITE_SUMMON_COOLDOWN_SEC = 3;
export const STALACTITE_RADIUS = 16;
export const STALACTITE_DAMAGE = 14;
export const STALACTITE_ROCK_TTL_SEC = 12;
export const MATRIARCA_MAX_MINIONS = 2;

export interface StalactiteRequest {
  x: number;
  y: number;
  radius: number;
  damage: number;
  roomIndex: number;
}

export interface StalactiteTelegraph {
  id: string;
  x: number;
  y: number;
  timer: number;
  radius: number;
  damage: number;
  roomIndex: number;
}

export interface StalactiteImpact {
  x: number;
  y: number;
  radius: number;
  damage: number;
  roomIndex: number;
}

let telegraphId = 0;

export function resetStalactiteIdsForTests(): void {
  telegraphId = 0;
}

export function createStalactiteTelegraph(req: StalactiteRequest): StalactiteTelegraph {
  telegraphId += 1;
  return {
    id: `stalactite-${telegraphId}`,
    x: req.x,
    y: req.y,
    timer: STALACTITE_TELEGRAPH_SEC,
    radius: req.radius,
    damage: req.damage,
    roomIndex: req.roomIndex,
  };
}

export function tickStalactiteTelegraphs(
  telegraphs: StalactiteTelegraph[],
  dt: number,
): { impacts: StalactiteImpact[]; remaining: StalactiteTelegraph[] } {
  const impacts: StalactiteImpact[] = [];
  const remaining: StalactiteTelegraph[] = [];

  for (const tele of telegraphs) {
    const nextTimer = tele.timer - dt;
    if (nextTimer <= 0) {
      impacts.push({
        x: tele.x,
        y: tele.y,
        radius: tele.radius,
        damage: tele.damage,
        roomIndex: tele.roomIndex,
      });
    } else {
      remaining.push({ ...tele, timer: nextTimer });
    }
  }

  return { impacts, remaining };
}
