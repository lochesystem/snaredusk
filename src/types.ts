import type { BiomeId } from './data/biomes.ts';

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
  /** 'default' = habitat principal; id do cercado = zona extra. */
  penId?: string;
}

export type BagEntry = LootItem | CreatureItem;

export interface SpecialItem {
  kind: 'special';
  id: string;
  name: string;
  description: string;
}

export const SPECIAL_BAG_SIZE = 4;

export interface BaseChestState {
  id: string;
  cellX: number;
  cellY: number;
  slots: (LootItem | null)[];
}

export interface BasePlacement {
  id: string;
  stationId: 'workbench' | 'chest_wood' | 'habitat_pen';
  cellX: number;
  cellY: number;
  rotation: 0 | 1 | 2 | 3;
  /** Área arrastada do cercado (células do grid). */
  habitatZone?: BaseHabitatZone;
}

export interface BaseHabitatZone {
  cellX: number;
  cellY: number;
  width: number;
  height: number;
}

export interface BaseGridState {
  width: number;
  height: number;
  cells: number[];
  placements: BasePlacement[];
  chests: BaseChestState[];
  freeBuildsUsed: number;
  nextPlacementId: number;
  /** @deprecated — zonas só existem via cercados colocados */
  habitatZone?: BaseHabitatZone;
}

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
  /** Slots 1–2 na hotbar (armas possuídas). */
  weaponHotbar: [string | null, string | null];
  bag: (BagEntry | null)[];
  /** Itens especiais da expedição — não ocupam slots da bolsa; somem ao voltar à base. */
  dungeonSpecial: (SpecialItem | null)[];
  habitat: CreatureItem[];
  shopLevel: number;
  shopShelves: (ShopListing | null)[];
  shopCages: (ShopListing | null)[];
  shopDayUsed: boolean;
  /** Criatura escolhida na base para acompanhar na masmorra. */
  partyCompanion: CreatureItem | null;
  bestiary: string[];
  dungeonCleared: boolean;
  activeBiome: BiomeId;
  unlockedBiomes: BiomeId[];
  biomeBossDefeated: Partial<Record<BiomeId, boolean>>;
  /** Chave dropada pelo Rei das Esporas (desbloqueia narrativa do Cristal). */
  hasSporeKey: boolean;
  /** Chave dropada pela Matriarca Prismática (desbloqueia o Termal). */
  hasPrismaticKey: boolean;
  /** Grid escavável da base subterrânea. */
  base: BaseGridState;
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

export function createEmptySpecialBag(): (SpecialItem | null)[] {
  return Array.from({ length: SPECIAL_BAG_SIZE }, () => null);
}

export function createShopShelves(count: number): (ShopListing | null)[] {
  return Array.from({ length: count }, () => null);
}

export function createShopCages(count: number): (ShopListing | null)[] {
  return Array.from({ length: count }, () => null);
}

import { STARTING_WEAPON_ID } from './data/weapons.ts';
import { defaultWeaponHotbar } from './systems/weaponHotbar.ts';
import { createDefaultBaseGrid } from './world/baseGrid.ts';

export function defaultGameState(): GameState {
  return {
    gold: 20,
    orbs: 3,
    playerHp: 100,
    playerStamina: 80,
    playerDef: 5,
    equippedWeaponId: STARTING_WEAPON_ID,
    ownedWeapons: [STARTING_WEAPON_ID],
    weaponHotbar: defaultWeaponHotbar(),
    bag: createEmptyBag(),
    dungeonSpecial: createEmptySpecialBag(),
    habitat: [],
    shopLevel: 1,
    shopShelves: createShopShelves(6),
    shopCages: createShopCages(1),
    shopDayUsed: false,
    partyCompanion: null,
    bestiary: [],
    dungeonCleared: false,
    activeBiome: 'floresta',
    unlockedBiomes: ['floresta'],
    biomeBossDefeated: {},
    hasSporeKey: false,
    hasPrismaticKey: false,
    base: createDefaultBaseGrid(),
  };
}
