import { describe, expect, it } from 'vitest';
import { getEnemyChestDrop } from '../src/data/items.ts';

describe('getEnemyChestDrop', () => {
  it('boss drops epic coroa de esporas', () => {
    const drop = getEnemyChestDrop('rei_esporas', true);
    expect(drop.epic).toBe(true);
    expect(drop.lootId).toBe('coroa_esporas');
    expect(drop.goldBonus).toBeGreaterThan(0);
  });

  it('common enemies drop appropriate loot', () => {
    expect(getEnemyChestDrop('lumimorcego', false).lootId).toBe('esporo_brilhante');
    expect(getEnemyChestDrop('esporo_dorminhoco', false).quantity).toBe(2);
    expect(getEnemyChestDrop('carapaca_musgo', false).lootId).toBe('nucleo_fungico');
  });
});
