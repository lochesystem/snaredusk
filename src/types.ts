import type { BiomeId } from './data/biomes.ts';
import type { StationId } from './data/baseStations.ts';

/** Passos do tutorial com Mira (MVP + reservados para PR 2). */
export type TutorialStepId =
  | 'welcome'
  | 'go_portal'
  | 'dungeon_move'
  | 'dungeon_attack'
  | 'dungeon_capture'
  | 'dungeon_exit'
  | 'return_home'
  | 'done'
  | 'build_habitat'
  | 'place_creature'
  | 'shop_stock'
  | 'shop_sell'
  | 'buy_orbes';

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
  /** Armas guardadas neste baú (até 4). */
  weaponSlots?: (string | null)[];
}

export interface BasePlacement {
  id: string;
  stationId: StationId;
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

export type ExpeditionFloor = 1 | 2 | 3 | 4;
export type ExpeditionPhase = 'exploring' | 'reward' | 'boss';

/**
 * Estado persistente de uma run roguelite.
 *
 * O checkpoint representa o começo do andar, não um frame no meio do combate.
 * Isso permite retomar com segurança sem serializar inimigos e projéteis.
 */
export interface ActiveExpedition {
  biomeId: BiomeId;
  seed: number;
  floor: ExpeditionFloor;
  phase: ExpeditionPhase;
  perks: string[];
  perkOffers: string[];
  defeatedEliteSpecies: string[];
  checkpointHp: number;
  checkpointStamina: number;
  checkpointBag: (BagEntry | null)[];
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
  /** Capuz cosmético ativo; o restante do traje permanece invariável. */
  equippedHoodId: import('./data/hoods.ts').HoodId;
  /** Capuzes fabricados e disponíveis no equipamento. */
  ownedHoods: import('./data/hoods.ts').HoodId[];
  equippedWeaponId: string;
  ownedWeapons: string[];
  /** Armas no arsenal da base (fora dos slots 1–2 e dos baús). */
  weaponStash: string[];
  /** Slots 1–2 na hotbar (armas levadas à masmorra). */
  weaponHotbar: [string | null, string | null];
  bag: (BagEntry | null)[];
  /** Itens especiais da expedição — não ocupam slots da bolsa; somem ao voltar à base. */
  dungeonSpecial: (SpecialItem | null)[];
  habitat: CreatureItem[];
  shopLevel: number;
  shopShelves: (ShopListing | null)[];
  shopCages: (ShopListing | null)[];
  shopDayUsed: boolean;
  /** Dia do ciclo (começa em 1). Avança apenas ao dormir na cama. */
  dayNumber: number;
  /** Run roguelite em andamento; nulo quando o jogador está na base. */
  activeExpedition: ActiveExpedition | null;
  /** Já entrou na masmorra neste dia (máx. 1 run). */
  dungeonUsedToday: boolean;
  /** Voltou da masmorra hoje — necessário para dormir. */
  dungeonReturnedToday: boolean;
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
  /** Construções fabricadas e prontas para colocação no modo Construir. */
  craftedStations: Partial<Record<StationId, number>>;
  /** Itens de construção atribuídos aos quatro slots inferiores da base. */
  buildHotbar: import('./systems/buildHotbar.ts').BuildHotbar;
  /** Tutorial com Mira concluído (MVP: base + masmorra + captura). */
  tutorialComplete: boolean;
  tutorialStep: TutorialStepId;
  /** Ouro total vendido na loja (vida útil do save). */
  shopGoldSold: number;
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
import { defaultBuildHotbar } from './systems/buildHotbar.ts';
import { createDefaultBaseGrid } from './world/baseGrid.ts';

export function defaultGameState(): GameState {
  return {
    gold: 20,
    orbs: 3,
    playerHp: 100,
    playerStamina: 80,
    playerDef: 5,
    equippedHoodId: 'cacador',
    ownedHoods: ['cacador'],
    equippedWeaponId: STARTING_WEAPON_ID,
    ownedWeapons: [STARTING_WEAPON_ID],
    weaponStash: [],
    weaponHotbar: defaultWeaponHotbar(),
    bag: createEmptyBag(),
    dungeonSpecial: createEmptySpecialBag(),
    habitat: [],
    shopLevel: 1,
    shopShelves: createShopShelves(6),
    shopCages: createShopCages(1),
    shopDayUsed: false,
    dayNumber: 1,
    activeExpedition: null,
    dungeonUsedToday: false,
    dungeonReturnedToday: false,
    partyCompanion: null,
    bestiary: [],
    dungeonCleared: false,
    activeBiome: 'floresta',
    unlockedBiomes: ['floresta'],
    biomeBossDefeated: {},
    hasSporeKey: false,
    hasPrismaticKey: false,
    base: createDefaultBaseGrid(),
    craftedStations: { habitat_pen: 1 },
    buildHotbar: defaultBuildHotbar(),
    tutorialComplete: false,
    tutorialStep: 'welcome',
    shopGoldSold: 0,
  };
}
