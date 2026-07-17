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
  behaviorId: string;
  def: number;
}

export interface GameState {
  gold: number;
  orbs: number;
  playerHp: number;
  playerStamina: number;
  playerDef: number;
  equippedWeaponId: string;
  ownedWeapons: string[];
  bag: (BagEntry | null)[];
  habitat: CreatureItem[];
  shopLevel: number;
  shopShelves: (ShopListing | null)[];
  shopCages: (ShopListing | null)[];
  shopDayUsed: boolean;
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

export type PriceTier = 'bargain' | 'perfect' | 'expensive' | 'refuse';

export function createEmptyBag(): (BagEntry | null)[] {
  return Array.from({ length: 12 }, () => null);
}

export function createShopShelves(count: number): (ShopListing | null)[] {
  return Array.from({ length: count }, () => null);
}

export function createShopCages(count: number): (ShopListing | null)[] {
  return Array.from({ length: count }, () => null);
}

import { STARTING_WEAPON_ID } from './data/weapons.ts';

export function defaultGameState(): GameState {
  return {
    gold: 20,
    orbs: 3,
    playerHp: 100,
    playerStamina: 80,
    playerDef: 5,
    equippedWeaponId: STARTING_WEAPON_ID,
    ownedWeapons: [STARTING_WEAPON_ID],
    bag: createEmptyBag(),
    habitat: [],
    shopLevel: 1,
    shopShelves: createShopShelves(6),
    shopCages: createShopCages(1),
    shopDayUsed: false,
    bestiary: [],
    dungeonCleared: false,
  };
}
