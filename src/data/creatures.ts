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
  },
};

export function getSpecies(id: string): SpeciesDef {
  const s = SPECIES[id];
  if (!s) throw new Error(`Espécie desconhecida: ${id}`);
  return s;
}
