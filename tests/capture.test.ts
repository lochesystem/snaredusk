import { describe, expect, it } from 'vitest';
import {
  canTargetForCapture,
  CAPTURE_MAX_CHANCE,
  CAPTURE_MIN_SHAKES,
  planCaptureSequence,
  rollCaptureChance,
  rollCaptureSuccess,
} from '../src/systems/capture.ts';

describe('capture', () => {
  it('can target any living enemy regardless of hp', () => {
    expect(canTargetForCapture(100, 100)).toBe(true);
    expect(canTargetForCapture(1, 100)).toBe(true);
    expect(canTargetForCapture(0, 100)).toBe(false);
  });

  it('full hp has low capture chance', () => {
    expect(rollCaptureChance({ targetHp: 100, targetMaxHp: 100 })).toBeCloseTo(0.05, 2);
  });

  it('low hp has much higher chance than full hp', () => {
    const low = rollCaptureChance({ targetHp: 10, targetMaxHp: 100 });
    const mid = rollCaptureChance({ targetHp: 50, targetMaxHp: 100 });
    const full = rollCaptureChance({ targetHp: 100, targetMaxHp: 100 });
    expect(low).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(full);
    expect(low).toBeGreaterThan(0.5);
  });

  it('aplica bônus de chance sem ultrapassar o limite de captura', () => {
    expect(rollCaptureChance({
      targetHp: 100,
      targetMaxHp: 100,
      bonusChance: 0.1,
    })).toBeCloseTo(0.15);
    expect(rollCaptureChance({
      targetHp: 1,
      targetMaxHp: 100,
      bonusChance: 0.5,
    })).toBe(CAPTURE_MAX_CHANCE);
  });

  it('rollCaptureSuccess respects rng', () => {
    expect(rollCaptureSuccess({ targetHp: 10, targetMaxHp: 100 }, () => 0.1)).toBe(true);
    expect(rollCaptureSuccess({ targetHp: 10, targetMaxHp: 100 }, () => 0.9)).toBe(false);
  });

  it('planCaptureSequence always uses three shakes', () => {
    const plan = planCaptureSequence({ targetHp: 40, targetMaxHp: 100 }, () => 0.5);
    expect(plan.totalShakes).toBe(CAPTURE_MIN_SHAKES);
    expect(plan.chance).toBeGreaterThan(0);
  });

  it('planCaptureSequence success has no fail shake', () => {
    const plan = planCaptureSequence({ targetHp: 5, targetMaxHp: 100 }, () => 0.01);
    expect(plan.success).toBe(true);
    expect(plan.failAtShake).toBeNull();
  });

  it('planCaptureSequence failure picks a fail shake', () => {
    const plan = planCaptureSequence({ targetHp: 100, targetMaxHp: 100 }, () => 0.99);
    expect(plan.success).toBe(false);
    expect(plan.failAtShake).toBeGreaterThanOrEqual(1);
    expect(plan.failAtShake).toBeLessThanOrEqual(3);
  });
});
