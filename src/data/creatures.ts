import type { SpeciesDef } from '../types.ts';

export const SPECIES: Record<string, SpeciesDef> = {
  lumimorcego: {
    id: 'lumimorcego',
    name: 'Lumimorcego',
    baseValue: 65,
    maxHp: 40,
    atk: 6,
    speed: 70,
    color: 0x5dbb63,
    accent: 0xc4f082,
    capturable: true,
    behaviorId: 'ranged',
    def: 2,
  },
  esporo_dorminhoco: {
    id: 'esporo_dorminhoco',
    name: 'Esporo Dorminhoco',
    baseValue: 45,
    maxHp: 30,
    atk: 4,
    speed: 45,
    color: 0x3d5c3a,
    accent: 0x8fd894,
    capturable: true,
    behaviorId: 'melee',
    def: 0,
  },
  carapaca_musgo: {
    id: 'carapaca_musgo',
    name: 'Carapaça de Musgo',
    baseValue: 90,
    maxHp: 55,
    atk: 8,
    speed: 35,
    color: 0x4a6a4a,
    accent: 0x6b9a6b,
    capturable: true,
    behaviorId: 'shielded',
    def: 8,
  },
  rei_esporas: {
    id: 'rei_esporas',
    name: 'Rei das Esporas',
    baseValue: 200,
    maxHp: 120,
    atk: 12,
    speed: 38,
    color: 0x6b4a8a,
    accent: 0xc4f082,
    capturable: true,
    behaviorId: 'boss_burst',
    def: 6,
  },
};

export function getSpecies(id: string): SpeciesDef {
  const s = SPECIES[id];
  if (!s) throw new Error(`Espécie desconhecida: ${id}`);
  return s;
}
