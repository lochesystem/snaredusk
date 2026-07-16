export type SceneId = 'title' | 'base' | 'dungeon' | 'shop';

export type ItemKind = 'loot' | 'creature';

export interface LootItem {
  kind: 'loot';
  id: string;
  name: string;
  baseValue: number;
  quantity: number;
}

export interface CreatureItem {
  kind: 'creature';
  speciesId: string;
  name: string;
  baseValue: number;
  nickname?: string;
}

export type BagEntry = LootItem | CreatureItem;

export interface ShopListing {
  entry: BagEntry;
  price: number;
  slotIndex: number;
  isCage: boolean;
}

export interface SpeciesDef {
  id: string;
  name: string;
  baseValue: number;
  maxHp: number;
  atk: number;
  speed: number;
  color: number;
  accent: number;
  capturable: boolean;
}

export interface GameState {
  gold: number;
  orbs: number;
  playerHp: number;
  bag: (BagEntry | null)[];
  habitat: CreatureItem[];
  shopShelves: (ShopListing | null)[];
  shopCage: ShopListing | null;
  bestiary: string[];
  dungeonCleared: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type PriceTier = 'bargain' | 'good' | 'too_high';

export function createEmptyBag(): (BagEntry | null)[] {
  return Array.from({ length: 12 }, () => null);
}

export function defaultGameState(): GameState {
  return {
    gold: 20,
    orbs: 3,
    playerHp: 100,
    bag: createEmptyBag(),
    habitat: [],
    shopShelves: [null, null, null],
    shopCage: null,
    bestiary: [],
    dungeonCleared: false,
  };
}
