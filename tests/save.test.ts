import { beforeEach, describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../src/engine/constants.ts';
import {
  deserializeState,
  hasSave,
  loadGame,
  saveGame,
  serializeState,
} from '../src/systems/saveManager.ts';
import { defaultGameState } from '../src/types.ts';

function installLocalStorageMock(): void {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value)),
    },
  });
}

describe('saveManager', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it('faz round-trip de todos os grupos persistentes do estado atual', () => {
    const state = defaultGameState();
    state.gold = 734;
    state.orbs = 17;
    state.playerHp = 63;
    state.playerStamina = 41;
    state.ownedHoods = ['cacador', 'fungico', 'prismatico'];
    state.equippedHoodId = 'prismatico';
    state.ownedWeapons = ['faca_enferrujada', 'picareta_combate'];
    state.weaponHotbar = ['faca_enferrujada', 'picareta_combate'];
    state.equippedWeaponId = 'picareta_combate';
    state.bag[0] = {
      kind: 'loot',
      id: 'fibra_musgo',
      name: 'Fibra de musgo',
      baseValue: 20,
      quantity: 7,
    };
    state.bag[1] = {
      kind: 'creature',
      speciesId: 'lumimorcego',
      name: 'Lumimorcego',
      baseValue: 65,
    };
    state.partyCompanion = {
      kind: 'creature',
      speciesId: 'esporo_dorminhoco',
      name: 'Esporo Dorminhoco',
      baseValue: 45,
    };
    state.bestiary = ['lumimorcego', 'rei_esporas'];
    state.shopLevel = 2;
    state.shopGoldSold = 780;
    state.dayNumber = 6;
    state.dungeonUsedToday = true;
    state.dungeonReturnedToday = true;
    state.biomeBossDefeated = { floresta: true };
    state.unlockedBiomes = ['floresta', 'cristal'];
    state.activeBiome = 'cristal';
    state.base.placements[0]!.rotation = 3;
    state.base.chests[0]!.slots[0] = {
      kind: 'loot',
      id: 'cogumelo_comum',
      name: 'Cogumelo comum',
      baseValue: 15,
      quantity: 9,
    };
    state.craftedStations.habitat_pen = 3;
    state.buildHotbar = ['habitat_pen', 'workbench', null, 'bed'];

    const payload = JSON.parse(serializeState(state));
    const loaded = deserializeState(JSON.stringify(payload));

    expect(payload.version).toBe(9);
    expect(loaded).not.toBeNull();
    expect(loaded).toMatchObject({
      gold: 734,
      orbs: 17,
      playerHp: 63,
      playerStamina: 41,
      equippedHoodId: 'prismatico',
      ownedHoods: ['cacador', 'fungico', 'prismatico'],
      equippedWeaponId: 'picareta_combate',
      weaponHotbar: ['faca_enferrujada', 'picareta_combate'],
      partyCompanion: { speciesId: 'esporo_dorminhoco' },
      bestiary: ['lumimorcego', 'rei_esporas'],
      shopLevel: 2,
      shopGoldSold: 780,
      dayNumber: 6,
      dungeonUsedToday: true,
      dungeonReturnedToday: true,
      activeBiome: 'cristal',
      craftedStations: { habitat_pen: 3 },
      buildHotbar: ['habitat_pen', 'workbench', null, 'bed'],
    });
    expect(loaded?.bag[0]).toMatchObject({ id: 'fibra_musgo', quantity: 7 });
    expect(loaded?.bag[1]).toMatchObject({ speciesId: 'lumimorcego' });
    expect(loaded?.base.placements[0]?.rotation).toBe(3);
    expect(loaded?.base.chests[0]?.slots[0]).toMatchObject({
      id: 'cogumelo_comum',
      quantity: 9,
    });
  });

  it('migra saves das versões 2–8 preenchendo campos introduzidos depois', () => {
    for (let version = 2; version <= 8; version++) {
      const loaded = deserializeState(JSON.stringify({
        version,
        state: {
          gold: 91,
          orbs: 4,
          bag: [],
        },
      }));

      expect(loaded, `versão ${version}`).not.toBeNull();
      expect(loaded?.gold).toBe(91);
      expect(loaded?.equippedHoodId).toBe('cacador');
      expect(loaded?.ownedWeapons).toContain('faca_enferrujada');
      expect(loaded?.unlockedBiomes).toContain('floresta');
      expect(loaded?.base.placements.some((p) => p.stationId === 'dungeon_portal')).toBe(true);
    }
  });

  it('migra save v1 com gaiola única para a coleção atual de gaiolas', () => {
    const loaded = deserializeState(JSON.stringify({
      version: 1,
      state: {
        gold: 55,
        orbs: 2,
        shopLevel: 1,
        shopShelves: [],
        shopCage: {
          entry: {
            kind: 'creature',
            speciesId: 'lumimorcego',
            name: 'Lumimorcego',
            baseValue: 65,
          },
          price: 65,
          slotIndex: 0,
          isCage: true,
        },
      },
    }));

    expect(loaded?.shopCages).toHaveLength(1);
    expect(loaded?.shopCages[0]?.entry).toMatchObject({ speciesId: 'lumimorcego' });
  });

  it('rejeita JSON quebrado, payload incompleto e versão futura desconhecida', () => {
    expect(deserializeState('{quebrado')).toBeNull();
    expect(deserializeState(JSON.stringify({ version: 9 }))).toBeNull();
    expect(deserializeState(JSON.stringify({ version: 99, state: {} }))).toBeNull();
    expect(deserializeState(JSON.stringify([]))).toBeNull();
  });

  it('normaliza valores perigosos sem impedir a recuperação do restante do save', () => {
    const loaded = deserializeState(JSON.stringify({
      version: 9,
      state: {
        ...defaultGameState(),
        gold: -200,
        orbs: 'muitas',
        playerHp: 900,
        playerStamina: -30,
        shopLevel: 999,
        dayNumber: 0,
        activeBiome: 'vazio',
        unlockedBiomes: ['vazio'],
        equippedWeaponId: 'arma_inexistente',
        ownedWeapons: ['arma_inexistente'],
        equippedHoodId: 'capuz_inexistente',
        ownedHoods: ['capuz_inexistente'],
        bag: [
          { kind: 'loot', id: 'fibra_musgo', name: 'Fibra', baseValue: 20, quantity: -4 },
          { kind: 'estranho', id: 'x' },
          { kind: 'loot', id: 'fibra_musgo', name: 'Fibra', baseValue: 20, quantity: 3 },
        ],
        base: 'corrompida',
        craftedStations: { bed: -8, habitat_pen: 2.8 },
        tutorialStep: 'passo_impossivel',
      },
    }));

    expect(loaded).not.toBeNull();
    expect(loaded).toMatchObject({
      gold: 0,
      orbs: 3,
      playerHp: 100,
      playerStamina: 0,
      shopLevel: 5,
      dayNumber: 1,
      activeBiome: 'floresta',
      equippedWeaponId: 'faca_enferrujada',
      equippedHoodId: 'cacador',
      ownedHoods: ['cacador'],
      tutorialStep: 'welcome',
    });
    expect(loaded?.bag.filter(Boolean)).toHaveLength(1);
    expect(loaded?.bag[0]).toMatchObject({ id: 'fibra_musgo', quantity: 3 });
    expect(loaded?.craftedStations).toMatchObject({ bed: 0, habitat_pen: 2 });
    expect(loaded?.base.placements.some((p) => p.stationId === 'bed')).toBe(true);
  });

  it('persiste no localStorage pela mesma chave usada pelo Continue', () => {
    const state = defaultGameState();
    state.gold = 321;

    expect(hasSave()).toBe(false);
    saveGame(state);
    expect(hasSave()).toBe(true);
    expect(localStorage.getItem(SAVE_KEY)).toContain('"gold":321');
    expect(loadGame()?.gold).toBe(321);

    localStorage.setItem(SAVE_KEY, '{inválido');
    expect(loadGame()).toBeNull();
  });
});
