import { SAVE_KEY } from '../engine/constants.ts';
import { STARTING_WEAPON_ID } from '../data/weapons.ts';
import {
  createEmptyBag,
  createEmptySpecialBag,
  createShopCages,
  createShopShelves,
  defaultGameState,
  type GameState,
} from '../types.ts';
import { getShopShelfCapacity, syncShopShelfCapacity } from './reputation.ts';
import { getShopLevelDef } from './shopUpgrade.ts';
import { defaultWeaponHotbar } from './weaponHotbar.ts';
import { syncBiomeUnlocks } from './biomeProgress.ts';
import type { BiomeId } from '../data/biomes.ts';
import { migrateLegacyHabitatCreatures } from './habitat.ts';
import { normalizeBaseGrid } from '../world/baseGrid.ts';
import { normalizeWeaponArmory } from './weaponArmory.ts';
import { normalizeBuildHotbar } from './buildHotbar.ts';
import { addLootToSlots, normalizeItemStacks } from './itemStacks.ts';
import { normalizeHoodEquipment } from './hoodEquipment.ts';
import { BIOME_ORDER } from '../data/biomes.ts';
import { WEAPONS } from '../data/weapons.ts';
import { PLAYER_MAX_HP, PLAYER_MAX_STAMINA } from '../engine/constants.ts';

const SAVE_VERSION = 9;
const TUTORIAL_STEPS = new Set([
  'welcome',
  'go_portal',
  'dungeon_move',
  'dungeon_attack',
  'dungeon_capture',
  'dungeon_exit',
  'return_home',
  'done',
  'build_habitat',
  'place_creature',
  'shop_stock',
  'shop_sell',
  'buy_orbes',
]);

interface SavePayloadV9 {
  version: number;
  state: GameState;
}

interface LegacyGameState extends Omit<GameState, 'shopCages' | 'shopLevel' | 'playerStamina' | 'playerDef' | 'equippedHoodId' | 'ownedHoods' | 'equippedWeaponId' | 'ownedWeapons' | 'weaponStash' | 'activeBiome' | 'unlockedBiomes' | 'biomeBossDefeated' | 'hasSporeKey' | 'hasPrismaticKey' | 'base' | 'craftedStations' | 'buildHotbar' | 'dayNumber' | 'dungeonUsedToday' | 'dungeonReturnedToday'> {
  shopCage?: GameState['shopCages'][number];
  shopCages?: GameState['shopCages'];
  shopLevel?: number;
  playerStamina?: number;
  playerDef?: number;
  equippedHoodId?: GameState['equippedHoodId'];
  ownedHoods?: GameState['ownedHoods'];
  equippedWeaponId?: string;
  ownedWeapons?: string[];
  weaponStash?: string[];
  activeBiome?: BiomeId;
  unlockedBiomes?: BiomeId[];
  biomeBossDefeated?: Partial<Record<BiomeId, boolean>>;
  hasSporeKey?: boolean;
  hasPrismaticKey?: boolean;
  base?: GameState['base'];
  craftedStations?: GameState['craftedStations'];
  buildHotbar?: GameState['buildHotbar'];
  dayNumber?: number;
  dungeonUsedToday?: boolean;
  dungeonReturnedToday?: boolean;
}

export function serializeState(state: GameState): string {
  const payload: SavePayloadV9 = { version: SAVE_VERSION, state };
  return JSON.stringify(payload);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(
  value: unknown,
  fallback: number,
  min = -Infinity,
  max = Infinity,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function finiteInteger(
  value: unknown,
  fallback: number,
  min = -Infinity,
  max = Infinity,
): number {
  return Math.floor(finiteNumber(value, fallback, min, max));
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function sanitizeBagEntry(value: unknown): GameState['bag'][number] {
  if (!isRecord(value)) return null;
  if (value.kind === 'loot') {
    if (
      typeof value.id !== 'string'
      || typeof value.name !== 'string'
      || typeof value.quantity !== 'number'
      || !Number.isFinite(value.quantity)
      || value.quantity <= 0
    ) {
      return null;
    }
    return {
      kind: 'loot',
      id: value.id,
      name: value.name,
      baseValue: finiteNumber(value.baseValue, 0, 0),
      quantity: Math.max(1, Math.floor(value.quantity)),
    };
  }
  if (value.kind === 'creature') {
    if (typeof value.speciesId !== 'string' || typeof value.name !== 'string') return null;
    return {
      kind: 'creature',
      speciesId: value.speciesId,
      name: value.name,
      baseValue: finiteNumber(value.baseValue, 0, 0),
      ...(typeof value.nickname === 'string' ? { nickname: value.nickname } : {}),
      ...(typeof value.penId === 'string' ? { penId: value.penId } : {}),
    };
  }
  return null;
}

function sanitizeBag(value: unknown): GameState['bag'] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map(sanitizeBagEntry);
}

function sanitizeCreature(value: unknown): GameState['partyCompanion'] {
  const entry = sanitizeBagEntry(value);
  return entry?.kind === 'creature' ? entry : null;
}

function sanitizeBase(value: unknown): GameState['base'] | undefined {
  if (!isRecord(value) || !Array.isArray(value.cells)) return undefined;
  return value as unknown as GameState['base'];
}

export function deserializeState(raw: string): GameState | null {
  try {
    const decoded: unknown = JSON.parse(raw);
    if (!isRecord(decoded) || !Number.isInteger(decoded.version) || !isRecord(decoded.state)) {
      return null;
    }
    const payload = decoded as unknown as { version: number; state: LegacyGameState };
    if (payload.version === 1) return normalizeState(migrateV1(payload.state));
    if (payload.version === 2) return normalizeState(migrateV2(payload.state));
    if (payload.version === 3) return normalizeState(payload.state);
    if (payload.version === 4) return normalizeState(payload.state);
    if (payload.version === 5) return normalizeState(payload.state);
    if (payload.version === 6) return normalizeState(payload.state);
    if (payload.version === 7) return normalizeState(payload.state);
    if (payload.version === 8) return normalizeState(payload.state);
    if (payload.version === SAVE_VERSION) return normalizeState(payload.state);
    return null;
  } catch {
    return null;
  }
}

function migrateV2(partial: LegacyGameState): GameState {
  return {
    ...defaultGameState(),
    ...partial,
    playerStamina: partial.playerStamina ?? 80,
    playerDef: partial.playerDef ?? 5,
    equippedWeaponId: partial.equippedWeaponId ?? STARTING_WEAPON_ID,
    ownedWeapons: partial.ownedWeapons ?? [STARTING_WEAPON_ID],
  };
}

function migrateV1(partial: LegacyGameState): GameState {
  const level = partial.shopLevel ?? 1;
  const def = getShopLevelDef(level);
  const shelves = createShopShelves(def.shelfCount);
  const cages = createShopCages(def.cageCount);

  if (partial.shopShelves) {
    for (let i = 0; i < Math.min(partial.shopShelves.length, shelves.length); i++) {
      shelves[i] = partial.shopShelves[i] ?? null;
    }
  }
  if (partial.shopCage) {
    cages[0] = { ...partial.shopCage, isCage: true, slotIndex: 0 };
  }

  return {
    ...defaultGameState(),
    ...partial,
    shopLevel: level,
    shopShelves: shelves,
    shopCages: cages,
  };
}

function normalizeState(partial: LegacyGameState): GameState {
  const base = defaultGameState();
  const level = finiteInteger(partial.shopLevel, base.shopLevel, 1, 5);
  const def = getShopLevelDef(level);
  const hoodEquipment = normalizeHoodEquipment(partial.ownedHoods, partial.equippedHoodId);
  const ownedWeapons = stringArray(partial.ownedWeapons)
    .filter((id, index, all) => Boolean(WEAPONS[id]) && all.indexOf(id) === index);
  if (!ownedWeapons.includes(STARTING_WEAPON_ID)) ownedWeapons.unshift(STARTING_WEAPON_ID);
  const equippedWeaponId = typeof partial.equippedWeaponId === 'string'
    && ownedWeapons.includes(partial.equippedWeaponId)
    && WEAPONS[partial.equippedWeaponId]
    ? partial.equippedWeaponId
    : STARTING_WEAPON_ID;
  const validBiomes = stringArray(partial.unlockedBiomes)
    .filter((id): id is BiomeId => BIOME_ORDER.includes(id as BiomeId));
  const activeBiome = BIOME_ORDER.includes(partial.activeBiome as BiomeId)
    ? partial.activeBiome as BiomeId
    : base.activeBiome;
  const habitat = Array.isArray(partial.habitat)
    ? partial.habitat.map(sanitizeCreature).filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];
  const bestiary = stringArray(partial.bestiary).filter(
    (id, index, all) => all.indexOf(id) === index,
  );
  const bossFlags = isRecord(partial.biomeBossDefeated)
    ? Object.fromEntries(BIOME_ORDER.map((id) => [id, partial.biomeBossDefeated?.[id] === true]))
    : {};
  const tutorialComplete = booleanValue(partial.tutorialComplete, true);
  const tutorialStep = typeof partial.tutorialStep === 'string' && TUTORIAL_STEPS.has(partial.tutorialStep)
    ? partial.tutorialStep
    : tutorialComplete ? 'done' : base.tutorialStep;
  const craftedStations = isRecord(partial.craftedStations)
    ? Object.fromEntries(
        Object.entries(partial.craftedStations)
          .filter(([, quantity]) => typeof quantity === 'number' && Number.isFinite(quantity))
          .map(([id, quantity]) => [id, Math.max(0, Math.floor(quantity as number))]),
      )
    : { ...base.craftedStations };

  const normalized: GameState = {
    ...base,
    ...partial,
    gold: finiteInteger(partial.gold, base.gold, 0),
    orbs: finiteInteger(partial.orbs, base.orbs, 0),
    playerHp: finiteNumber(partial.playerHp, base.playerHp, 0, PLAYER_MAX_HP),
    playerStamina: finiteNumber(
      partial.playerStamina,
      base.playerStamina,
      0,
      PLAYER_MAX_STAMINA,
    ),
    playerDef: finiteInteger(partial.playerDef, base.playerDef, 0),
    shopLevel: level,
    ...hoodEquipment,
    equippedWeaponId,
    ownedWeapons,
    weaponStash: stringArray(partial.weaponStash).filter((id) => ownedWeapons.includes(id)),
    weaponHotbar: normalizeWeaponHotbar(
      Array.isArray(partial.weaponHotbar) ? partial.weaponHotbar : undefined,
      ownedWeapons,
    ),
    bag: padBag(sanitizeBag(partial.bag)),
    dungeonSpecial: padSpecialBag(Array.isArray(partial.dungeonSpecial) ? partial.dungeonSpecial : undefined),
    shopShelves: padShelves(Array.isArray(partial.shopShelves) ? partial.shopShelves : undefined, def.shelfCount),
    shopCages: padCages(
      Array.isArray(partial.shopCages) ? partial.shopCages : undefined,
      isRecord(partial.shopCage) ? partial.shopCage as LegacyGameState['shopCage'] : undefined,
      def.cageCount,
    ),
    shopDayUsed: booleanValue(partial.shopDayUsed, false),
    dayNumber: finiteInteger(partial.dayNumber, 1, 1),
    dungeonUsedToday: booleanValue(partial.dungeonUsedToday, false),
    dungeonReturnedToday: booleanValue(partial.dungeonReturnedToday, false),
    partyCompanion: sanitizeCreature(partial.partyCompanion),
    habitat,
    bestiary,
    dungeonCleared: booleanValue(partial.dungeonCleared, false),
    activeBiome,
    unlockedBiomes: validBiomes.length > 0 ? validBiomes : [...base.unlockedBiomes],
    biomeBossDefeated: bossFlags,
    hasSporeKey: booleanValue(partial.hasSporeKey, false),
    hasPrismaticKey: booleanValue(partial.hasPrismaticKey, false),
    base: normalizeBaseGrid(sanitizeBase(partial.base)),
    craftedStations,
    buildHotbar: normalizeBuildHotbar(partial.buildHotbar),
    tutorialComplete,
    tutorialStep,
    shopGoldSold: finiteInteger(partial.shopGoldSold, 0, 0),
  };
  if (normalized.dungeonCleared) {
    normalized.biomeBossDefeated.floresta = true;
  }
  if (
    !normalized.tutorialComplete
    && (normalized.tutorialStep === 'return_home' || normalized.tutorialStep === 'build_habitat')
    && (normalized.craftedStations.habitat_pen ?? 0) < 1
  ) {
    normalized.craftedStations.habitat_pen = 1;
  }
  syncBiomeUnlocks(normalized);
  migrateLegacyHabitatCreatures(normalized);
  normalizeWeaponArmory(normalized);
  syncShopShelfCapacity(normalized);
  return normalized;
}

function normalizeWeaponHotbar(
  hotbar: [string | null, string | null] | undefined,
  owned: string[],
): [string | null, string | null] {
  const slots = hotbar ?? defaultWeaponHotbar();
  return [
    slots[0] && owned.includes(slots[0]) ? slots[0] : owned[0] ?? null,
    slots[1] && owned.includes(slots[1]) ? slots[1] : null,
  ];
}

function padBag(bag: (GameState['bag'][number] | null)[] | undefined): GameState['bag'] {
  // Saves comuns continuam com 12 slots. Saves especiais de QA podem declarar
  // uma bolsa maior para reunir todo o catálogo sem alterar o novo jogo.
  const slotCount = Math.max(createEmptyBag().length, bag?.length ?? 0);
  return normalizeItemStacks(bag, slotCount) as GameState['bag'];
}

function padSpecialBag(
  special: (GameState['dungeonSpecial'][number] | null)[] | undefined,
): GameState['dungeonSpecial'] {
  const slots = createEmptySpecialBag();
  if (!special) return slots;
  for (let i = 0; i < Math.min(special.length, slots.length); i++) {
    slots[i] = special[i] ?? null;
  }
  return slots;
}

function padShelves(
  shelves: (GameState['shopShelves'][number] | null)[] | undefined,
  count: number,
): GameState['shopShelves'] {
  const slots = createShopShelves(count);
  if (!shelves) return slots;
  for (let i = 0; i < Math.min(shelves.length, slots.length); i++) {
    slots[i] = shelves[i] ?? null;
  }
  return slots;
}

function padCages(
  cages: (GameState['shopCages'][number] | null)[] | undefined,
  legacyCage: LegacyGameState['shopCage'],
  count: number,
): GameState['shopCages'] {
  const slots = createShopCages(count);
  if (legacyCage) {
    slots[0] = { ...legacyCage, isCage: true, slotIndex: 0 };
  }
  if (cages) {
    for (let i = 0; i < Math.min(cages.length, slots.length); i++) {
      slots[i] = cages[i] ?? null;
    }
  }
  return slots;
}

export function saveGame(state: GameState): void {
  localStorage.setItem(SAVE_KEY, serializeState(state));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  return deserializeState(raw);
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function addToBag(state: GameState, entry: GameState['bag'][number]): boolean {
  if (!entry) return false;
  if (entry.kind === 'loot') {
    return addLootToSlots(state.bag, entry, entry.quantity) === entry.quantity;
  }
  const idx = state.bag.findIndex((s) => s === null);
  if (idx === -1) return false;
  state.bag[idx] = entry;
  return true;
}

export function bagCount(state: GameState): number {
  return state.bag.filter(Boolean).length;
}

export function resizeShopForLevel(state: GameState, level: number): void {
  state.shopLevel = level;
  const def = getShopLevelDef(level);
  state.shopShelves = padShelves(state.shopShelves, getShopShelfCapacity(state));
  state.shopCages = padCages(state.shopCages, undefined, def.cageCount);
}
