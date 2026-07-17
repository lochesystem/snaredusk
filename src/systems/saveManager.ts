import { SAVE_KEY } from '../engine/constants.ts';
import { STARTING_WEAPON_ID } from '../data/weapons.ts';
import {
  createEmptyBag,
  createShopCages,
  createShopShelves,
  defaultGameState,
  type GameState,
} from '../types.ts';
import { getShopLevelDef } from './shopUpgrade.ts';
import { defaultWeaponHotbar } from './weaponHotbar.ts';
import { syncBiomeUnlocks } from './biomeProgress.ts';
import type { BiomeId } from '../data/biomes.ts';

const SAVE_VERSION = 4;

interface SavePayloadV4 {
  version: number;
  state: GameState;
}

interface LegacyGameState extends Omit<GameState, 'shopCages' | 'shopLevel' | 'playerStamina' | 'playerDef' | 'equippedWeaponId' | 'ownedWeapons' | 'activeBiome' | 'unlockedBiomes' | 'biomeBossDefeated' | 'hasSporeKey'> {
  shopCage?: GameState['shopCages'][number];
  shopCages?: GameState['shopCages'];
  shopLevel?: number;
  playerStamina?: number;
  playerDef?: number;
  equippedWeaponId?: string;
  ownedWeapons?: string[];
  activeBiome?: BiomeId;
  unlockedBiomes?: BiomeId[];
  biomeBossDefeated?: Partial<Record<BiomeId, boolean>>;
  hasSporeKey?: boolean;
}

export function serializeState(state: GameState): string {
  const payload: SavePayloadV4 = { version: SAVE_VERSION, state };
  return JSON.stringify(payload);
}

export function deserializeState(raw: string): GameState | null {
  try {
    const payload = JSON.parse(raw) as { version: number; state: LegacyGameState };
    if (!payload.state) return null;
    if (payload.version === 1) return normalizeState(migrateV1(payload.state));
    if (payload.version === 2) return normalizeState(migrateV2(payload.state));
    if (payload.version === 3) return normalizeState(payload.state);
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
  const level = partial.shopLevel ?? base.shopLevel;
  const def = getShopLevelDef(level);

  const normalized: GameState = {
    ...base,
    ...partial,
    shopLevel: level,
    playerStamina: partial.playerStamina ?? base.playerStamina,
    playerDef: partial.playerDef ?? base.playerDef,
    equippedWeaponId: partial.equippedWeaponId ?? base.equippedWeaponId,
    ownedWeapons: partial.ownedWeapons?.length ? partial.ownedWeapons : base.ownedWeapons,
    weaponHotbar: normalizeWeaponHotbar(partial.weaponHotbar, partial.ownedWeapons ?? base.ownedWeapons),
    bag: padBag(partial.bag),
    shopShelves: padShelves(partial.shopShelves, def.shelfCount),
    shopCages: padCages(partial.shopCages, partial.shopCage, def.cageCount),
    shopDayUsed: partial.shopDayUsed ?? false,
    partyCompanion: partial.partyCompanion ?? null,
    habitat: partial.habitat ?? [],
    bestiary: partial.bestiary ?? [],
    dungeonCleared: partial.dungeonCleared ?? false,
    activeBiome: partial.activeBiome ?? base.activeBiome,
    unlockedBiomes: partial.unlockedBiomes?.length ? [...partial.unlockedBiomes] : [...base.unlockedBiomes],
    biomeBossDefeated: { ...partial.biomeBossDefeated },
    hasSporeKey: partial.hasSporeKey ?? false,
  };
  if (normalized.dungeonCleared) {
    normalized.biomeBossDefeated.floresta = true;
  }
  syncBiomeUnlocks(normalized);
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
  const slots = createEmptyBag();
  if (!bag) return slots;
  for (let i = 0; i < Math.min(bag.length, slots.length); i++) {
    slots[i] = bag[i] ?? null;
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
  const idx = state.bag.findIndex((s) => s === null);
  if (idx === -1) return false;
  state.bag[idx] = entry;
  return true;
}

export function bagCount(state: GameState): number {
  return state.bag.filter(Boolean).length;
}

export function resizeShopForLevel(state: GameState, level: number): void {
  const def = getShopLevelDef(level);
  state.shopLevel = level;
  state.shopShelves = padShelves(state.shopShelves, def.shelfCount);
  state.shopCages = padCages(state.shopCages, undefined, def.cageCount);
}
