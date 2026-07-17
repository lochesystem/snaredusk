import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { assignPartyCompanion, stashPartyCompanion } from '../src/systems/party.ts';
import { bagCount } from '../src/systems/saveManager.ts';

describe('party', () => {
  it('atribui criatura da bolsa e remove do slot', () => {
    const state = defaultGameState();
    state.bag[0] = {
      kind: 'creature',
      speciesId: 'carapaca_musgo',
      name: 'Carapaça de Musgo',
      baseValue: 90,
    };
    const c = assignPartyCompanion(state, { kind: 'bag', index: 0 });
    expect(c?.name).toBe('Carapaça de Musgo');
    expect(state.partyCompanion?.speciesId).toBe('carapaca_musgo');
    expect(state.bag[0]).toBeNull();
  });

  it('devolve companheiro à bolsa', () => {
    const state = defaultGameState();
    state.partyCompanion = {
      kind: 'creature',
      speciesId: 'lumimorcego',
      name: 'Lumimorcego',
      baseValue: 65,
    };
    expect(stashPartyCompanion(state)).toBe(true);
    expect(state.partyCompanion).toBeNull();
    expect(bagCount(state)).toBe(1);
  });

  it('atribui criatura do habitat', () => {
    const state = defaultGameState();
    state.habitat.push({
      kind: 'creature',
      speciesId: 'esporo_dorminhoco',
      name: 'Esporo Dorminhoco',
      baseValue: 45,
    });
    assignPartyCompanion(state, { kind: 'habitat', index: 0 });
    expect(state.habitat).toHaveLength(0);
    expect(state.partyCompanion?.speciesId).toBe('esporo_dorminhoco');
  });
});
