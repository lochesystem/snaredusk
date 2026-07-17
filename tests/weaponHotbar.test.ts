import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { selectHotbarSlot, syncWeaponHotbar } from '../src/systems/weaponHotbar.ts';

describe('weaponHotbar', () => {
  it('preenche slots com armas possuídas', () => {
    const state = defaultGameState();
    state.ownedWeapons = ['faca_enferrujada', 'picareta_combate'];
    state.weaponHotbar = [null, null];

    syncWeaponHotbar(state);

    expect(state.weaponHotbar).toContain('faca_enferrujada');
    expect(state.weaponHotbar).toContain('picareta_combate');
  });

  it('troca arma equipada pelo slot da hotbar', () => {
    const state = defaultGameState();
    state.ownedWeapons = ['faca_enferrujada', 'picareta_combate'];
    state.weaponHotbar = ['faca_enferrujada', 'picareta_combate'];
    state.equippedWeaponId = 'faca_enferrujada';

    expect(selectHotbarSlot(state, 1)).toBe(true);
    expect(state.equippedWeaponId).toBe('picareta_combate');
  });

  it('ignora slot vazio ou arma não possuída', () => {
    const state = defaultGameState();
    state.weaponHotbar = [null, 'picareta_combate'];
    state.equippedWeaponId = 'faca_enferrujada';

    expect(selectHotbarSlot(state, 0)).toBe(false);
    expect(state.equippedWeaponId).toBe('faca_enferrujada');

    state.ownedWeapons = ['faca_enferrujada', 'picareta_combate'];
    expect(selectHotbarSlot(state, 1)).toBe(true);
  });
});
