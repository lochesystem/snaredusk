import { describe, expect, it } from 'vitest';
import {
  buildCompanionRangedShot,
  companionAttackRange,
  companionFollowAnchor,
  companionRangedAnchor,
  computeCompanionIntent,
  hasLineOfSight,
  isCompanionRanged,
  shouldMoveTowardGoal,
} from '../src/systems/companionCombat.ts';

describe('companionCombat', () => {
  it('lumimorcego é companheiro ranged', () => {
    expect(isCompanionRanged('ranged')).toBe(true);
    expect(companionAttackRange('ranged')).toBe(140);
  });

  it('melee não é ranged', () => {
    expect(isCompanionRanged('melee')).toBe(false);
  });

  it('gera projétil de companheiro', () => {
    const shot = buildCompanionRangedShot('ranged', 0, 0, 100, 0, 6, 2);
    expect(shot.data.owner).toBe('companion');
    expect(shot.data.damage).toBeGreaterThan(0);
    expect(shot.visualStyle).toBe('spore');
    expect(shot.attackCooldown).toBe(2);
  });

  it('ancora ranged fica perto do jogador na direção do inimigo', () => {
    const anchor = companionRangedAnchor(0, 0, 100, 0);
    expect(anchor.x).toBeGreaterThan(0);
    expect(anchor.x).toBeLessThan(100);
    expect(Math.abs(anchor.y)).toBeLessThan(1);
  });

  it('sem alvo, segue o jogador', () => {
    const intent = computeCompanionIntent({
      behaviorId: 'ranged',
      compX: 50,
      compY: 50,
      playerX: 0,
      playerY: 0,
      attackCd: 0,
      atk: 6,
      walls: [],
      target: null,
    });
    const follow = companionFollowAnchor(0, 0);
    expect(intent.goalX).toBe(follow.x);
    expect(intent.goalY).toBe(follow.y);
    expect(intent.shouldShoot).toBe(false);
  });

  it('não atira sem linha de visão', () => {
    const wall = { x: 40, y: -20, width: 20, height: 40 };
    const intent = computeCompanionIntent({
      behaviorId: 'ranged',
      compX: 0,
      compY: 0,
      playerX: 0,
      playerY: 0,
      attackCd: 0,
      atk: 6,
      walls: [wall],
      target: { x: 100, y: 0, def: 0 },
    });
    expect(hasLineOfSight(0, 0, 100, 0, [wall])).toBe(false);
    expect(intent.shouldShoot).toBe(false);
    expect(intent.goalX).not.toBe(0);
  });

  it('atira com LOS e perto da âncora', () => {
    const intent = computeCompanionIntent({
      behaviorId: 'ranged',
      compX: 40,
      compY: 0,
      playerX: 0,
      playerY: 0,
      attackCd: 0,
      atk: 6,
      walls: [],
      target: { x: 120, y: 0, def: 0 },
    });
    expect(intent.shouldShoot).toBe(true);
  });

  it('shouldMoveTowardGoal respeita gap mínimo', () => {
    expect(shouldMoveTowardGoal(0, 0, 10, 0, 6)).toBe(true);
    expect(shouldMoveTowardGoal(0, 0, 3, 0, 6)).toBe(false);
  });
});
