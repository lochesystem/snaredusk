import { describe, expect, it } from 'vitest';
import {
  BOSS_GATE_INNER_CLEARANCE,
  isPointInsideRoom,
  isPastBossGates,
  shouldStartBossIntro,
} from '../src/systems/bossMechanics.ts';

describe('boss arena entry', () => {
  const room = {
    rect: { x: 100, y: 100, width: 360, height: 280 },
    doors: ['w' as const],
  };
  const gateWalls = [{ x: 100, y: 228, width: 14, height: 52 }];

  it('does not start intro outside the boss room', () => {
    expect(
      shouldStartBossIntro({
        playerX: 60,
        playerY: 240,
        room,
        gateWalls,
        gateOpened: true,
        gateClosed: false,
        hasKey: true,
      }),
    ).toBe(false);
  });

  it('does not start intro with gate still closed', () => {
    expect(
      shouldStartBossIntro({
        playerX: 130,
        playerY: 254,
        room,
        gateWalls,
        gateOpened: true,
        gateClosed: true,
        hasKey: true,
      }),
    ).toBe(false);
  });

  it('does not start intro without the arena key', () => {
    expect(
      shouldStartBossIntro({
        playerX: 130,
        playerY: 254,
        room,
        gateWalls,
        gateOpened: true,
        gateClosed: false,
        hasKey: false,
      }),
    ).toBe(false);
  });

  it('does not start intro still at the gate (before murinho)', () => {
    expect(
      shouldStartBossIntro({
        playerX: 112,
        playerY: 254,
        room,
        gateWalls,
        gateOpened: true,
        gateClosed: false,
        hasKey: true,
      }),
    ).toBe(false);
  });

  it('starts intro just past the gate on the entry corridor (west door)', () => {
    const pastGateX = gateWalls[0]!.x + gateWalls[0]!.width + BOSS_GATE_INNER_CLEARANCE + 2;
    expect(
      shouldStartBossIntro({
        playerX: pastGateX,
        playerY: 254,
        room,
        gateWalls,
        gateOpened: true,
        gateClosed: false,
        hasKey: true,
      }),
    ).toBe(true);
  });

  it('isPastBossGates allows entry corridor centerline (no side-step needed)', () => {
    const pastGateX = gateWalls[0]!.x + gateWalls[0]!.width + BOSS_GATE_INNER_CLEARANCE + 2;
    expect(isPointInsideRoom(pastGateX, 254, room.rect)).toBe(true);
    expect(isPastBossGates(pastGateX, 254, gateWalls, room.rect)).toBe(true);
  });
});
