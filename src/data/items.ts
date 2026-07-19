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
  chave_esporo: { id: 'chave_esporo', name: 'Chave de Esporo', baseValue: 0, rarity: 'epic' },
  fragmento_cristal: { id: 'fragmento_cristal', name: 'Fragmento de cristal', baseValue: 35, rarity: 'common' },
  quartzo_bruto: { id: 'quartzo_bruto', name: 'Quartzo bruto', baseValue: 30, rarity: 'common' },
  poeira_prismatica: { id: 'poeira_prismatica', name: 'Poeira prismática', baseValue: 55, rarity: 'uncommon' },
  gema_rachada: { id: 'gema_rachada', name: 'Gema rachada', baseValue: 90, rarity: 'rare' },
  coroa_cristal: { id: 'coroa_cristal', name: 'Coroa de Cristal', baseValue: 130, rarity: 'epic' },
  chave_prismatica: { id: 'chave_prismatica', name: 'Chave Prismática', baseValue: 0, rarity: 'epic' },
  escama_termal: { id: 'escama_termal', name: 'Escama termal', baseValue: 40, rarity: 'common' },
  concha_vapor: { id: 'concha_vapor', name: 'Concha de vapor', baseValue: 28, rarity: 'common' },
  essencia_termal: { id: 'essencia_termal', name: 'Essência térmica', baseValue: 55, rarity: 'uncommon' },
  nucleo_bruma: { id: 'nucleo_bruma', name: 'Núcleo de bruma', baseValue: 95, rarity: 'rare' },
  coroa_termal: { id: 'coroa_termal', name: 'Coroa Termal', baseValue: 140, rarity: 'epic' },
  po_bioluminescente: { id: 'po_bioluminescente', name: 'Pó bioluminescente', baseValue: 25, rarity: 'uncommon' },
  condensado: { id: 'condensado', name: 'Condensado', baseValue: 22, rarity: 'common' },
};

export interface EnemyChestDrop {
  lootId: string;
  quantity: number;
  epic: boolean;
  goldBonus: number;
}

/** Loot do baú deixado ao derrotar ou capturar um monstro. */
export function getEnemyChestDrop(speciesId: string, _isBoss: boolean): EnemyChestDrop {
  if (speciesId === 'rei_esporas') {
    return { lootId: 'coroa_esporas', quantity: 1, epic: true, goldBonus: 35 };
  }
  if (speciesId === 'matriarca_prismatica') {
    return { lootId: 'coroa_cristal', quantity: 1, epic: true, goldBonus: 45 };
  }
  if (speciesId === 'salamandra_ancia') {
    return { lootId: 'coroa_termal', quantity: 1, epic: true, goldBonus: 55 };
  }
  switch (speciesId) {
    case 'lumimorcego':
      return { lootId: 'esporo_brilhante', quantity: 1, epic: false, goldBonus: 0 };
    case 'carapaca_musgo':
      return { lootId: 'nucleo_fungico', quantity: 1, epic: false, goldBonus: 8 };
    case 'esporo_dorminhoco':
      return { lootId: 'fibra_musgo', quantity: 2, epic: false, goldBonus: 0 };
    case 'prismarin':
      return { lootId: 'poeira_prismatica', quantity: 1, epic: false, goldBonus: 0 };
    case 'lumicascalho':
      return { lootId: 'quartzo_bruto', quantity: 2, epic: false, goldBonus: 0 };
    case 'eco_quartzo':
      return { lootId: 'gema_rachada', quantity: 1, epic: false, goldBonus: 10 };
    case 'salamandra':
      return { lootId: 'escama_termal', quantity: 2, epic: false, goldBonus: 0 };
    case 'vaporoso':
      return { lootId: 'concha_vapor', quantity: 1, epic: false, goldBonus: 0 };
    case 'caranguejo_termal':
      return { lootId: 'nucleo_bruma', quantity: 1, epic: false, goldBonus: 12 };
    default:
      return { lootId: 'cogumelo_comum', quantity: 1, epic: false, goldBonus: 0 };
  }
}
