import { describe, expect, it } from 'vitest';
import { createEnemyStatusBars, updateEnemyStatusBars } from '../src/world/enemyStatusBars.ts';

describe('enemyStatusBars', () => {
  it('creates shield bar when enemy has shield', () => {
    const bars = createEnemyStatusBars(true, false);
    expect(bars.shieldFill).not.toBeNull();
    updateEnemyStatusBars(bars, 50, 100, 20, 30);
    expect(bars.shieldFill?.visible).toBe(true);
  });

  it('hides shield bar when shield is depleted', () => {
    const bars = createEnemyStatusBars(true, false);
    updateEnemyStatusBars(bars, 50, 100, 0, 30);
    expect(bars.shieldFill?.visible).toBe(false);
  });

  it('creates a wider identified bar for elites', () => {
    const bars = createEnemyStatusBars(true, false, true, 'Bastião');
    expect(bars.barWidth).toBe(40);
    expect(bars.eliteLabel?.text).toContain('Bastião');
  });
});
