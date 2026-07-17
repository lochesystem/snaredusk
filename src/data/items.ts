export type LootRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface LootDef {
  id: string;
  name: string;
  baseValue: number;
  rarity: LootRarity;
}

export const LOOT_TABLE: Record<string, LootDef> = {
  cogumelo_comum: { id: 'cogumelo_comum', name: 'Cogumelo comum', baseValue: 15, rarity: 'common' },
  fibra_musgo: { id: 'fibra_musgo', name: 'Fibra de musgo', baseValue: 20, rarity: 'uncommon' },
  esporo_brilhante: { id: 'esporo_brilhante', name: 'Esporo brilhante', baseValue: 45, rarity: 'rare' },
  nucleo_fungico: { id: 'nucleo_fungico', name: 'Núcleo fúngico', baseValue: 75, rarity: 'rare' },
  coroa_esporas: { id: 'coroa_esporas', name: 'Coroa de Esporas', baseValue: 120, rarity: 'epic' },
};

export interface EnemyChestDrop {
  lootId: string;
  quantity: number;
  epic: boolean;
  goldBonus: number;
}

/** Loot do baú deixado ao derrotar ou capturar um monstro. */
export function getEnemyChestDrop(speciesId: string, isBoss: boolean): EnemyChestDrop {
  if (isBoss || speciesId === 'rei_esporas') {
    return { lootId: 'coroa_esporas', quantity: 1, epic: true, goldBonus: 35 };
  }
  switch (speciesId) {
    case 'lumimorcego':
      return { lootId: 'esporo_brilhante', quantity: 1, epic: false, goldBonus: 0 };
    case 'carapaca_musgo':
      return { lootId: 'nucleo_fungico', quantity: 1, epic: false, goldBonus: 8 };
    case 'esporo_dorminhoco':
      return { lootId: 'fibra_musgo', quantity: 2, epic: false, goldBonus: 0 };
    default:
      return { lootId: 'cogumelo_comum', quantity: 1, epic: false, goldBonus: 0 };
  }
}
