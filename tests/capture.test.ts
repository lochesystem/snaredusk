import { describe, expect, it } from 'vitest';
import {
  canTargetForCapture,
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

  it('rollCaptureSuccess respects rng', () => {
    expect(rollCaptureSuccess({ targetHp: 10, targetMaxHp: 100 }, () => 0.1)).toBe(true);
    expect(rollCaptureSuccess({ targetHp: 10, targetMaxHp: 100 }, () => 0.9)).toBe(false);
  });
});
