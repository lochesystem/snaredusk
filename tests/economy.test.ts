import { describe, expect, it } from 'vitest';
import { BIOMES, type BiomeId } from '../src/data/biomes.ts';
import { LOOT_TABLE } from '../src/data/items.ts';
import { CRAFT_RECIPES } from '../src/data/recipes.ts';
import { SPECIES } from '../src/data/creatures.ts';
import { craftWeapon } from '../src/systems/craft.ts';
import { endDay } from '../src/systems/dayCycle.ts';
import { bagEntryTotalValue } from '../src/systems/inventory.ts';
import { buyOrbPack } from '../src/systems/orbShop.ts';
import { addToBag } from '../src/systems/saveManager.ts';
import { runShopDay } from '../src/systems/shopDay.ts';
import { tryUpgradeShop } from '../src/systems/shopProgress.ts';
import { getNextShopLevel } from '../src/systems/shopUpgrade.ts';
import { getReputationLevel } from '../src/systems/reputation.ts';
import { defaultGameState, type GameState, type LootItem } from '../src/types.ts';

type EconomyProfileId = 'conservador' | 'normal' | 'eficiente';

interface EconomyProfile {
  id: EconomyProfileId;
  lootMultiplier: number;
  captureEvery: number;
  listingBatch: number;
  priceRatio: number;
  craftGoals: string[];
}

interface EconomyReport {
  profile: EconomyProfileId;
  days: number;
  finalGold: number;
  minimumGold: number;
  finalOrbs: number;
  shopRevenue: number;
  orbSpend: number;
  craftSpend: number;
  missedCaptures: number;
  crafted: string[];
  shopLevel: number;
  reputationLevel: number;
  netWorth: number;
}

const PROFILES: EconomyProfile[] = [
  {
    id: 'conservador',
    lootMultiplier: 1,
    captureEvery: 2,
    listingBatch: 1,
    priceRatio: 0.92,
    craftGoals: ['craft_picareta', 'craft_lanca_esporo'],
  },
  {
    id: 'normal',
    lootMultiplier: 2,
    captureEvery: 1,
    listingBatch: 2,
    priceRatio: 1,
    craftGoals: [
      'craft_picareta',
      'craft_lanca_esporo',
      'craft_capuz_fungico',
      'craft_lamina_prismatica',
      'craft_capuz_prismatico',
      'craft_tridente_termal',
      'craft_capuz_termal',
    ],
  },
  {
    id: 'eficiente',
    lootMultiplier: 3,
    captureEvery: 1,
    listingBatch: 3,
    priceRatio: 1.08,
    craftGoals: [
      'craft_picareta',
      'craft_lanca_esporo',
      'craft_foice_micelio',
      'craft_capuz_fungico',
      'craft_lamina_prismatica',
      'craft_capuz_prismatico',
      'craft_tridente_termal',
      'craft_capuz_termal',
    ],
  },
];

const BIOME_SCHEDULE: BiomeId[] = [
  'floresta',
  'floresta',
  'floresta',
  'cristal',
  'cristal',
  'cristal',
  'termal',
  'termal',
  'termal',
  'termal',
];

function seededRng(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function lootEntry(id: string, quantity: number): LootItem {
  const def = LOOT_TABLE[id]!;
  return {
    kind: 'loot',
    id: def.id,
    name: def.name,
    baseValue: def.baseValue,
    quantity,
  };
}

function grantDungeonLoot(state: GameState, biomeId: BiomeId, multiplier: number): void {
  const pool = BIOMES[biomeId].chestLoot;
  const quantities = [2, 2, 1, 1, 1];
  for (let index = 0; index < pool.length; index++) {
    const id = pool[index]!;
    addToBag(state, lootEntry(id, quantities[index]! * multiplier));
  }
}

function captureCreature(state: GameState, biomeId: BiomeId, day: number): boolean {
  if (state.orbs <= 0) return false;
  const pool = BIOMES[biomeId].enemySpecies;
  const speciesId = pool[day % pool.length]!;
  const species = SPECIES[speciesId]!;
  state.orbs -= 1;
  return addToBag(state, {
    kind: 'creature',
    speciesId,
    name: species.name,
    baseValue: species.baseValue,
  });
}

function tryCraftGoals(
  state: GameState,
  profile: EconomyProfile,
  crafted: Set<string>,
): number {
  let spent = 0;
  for (const recipeId of profile.craftGoals) {
    if (crafted.has(recipeId)) continue;
    const before = state.gold;
    if (!craftWeapon(state, recipeId)) continue;
    spent += before - state.gold;
    crafted.add(recipeId);
  }
  return spent;
}

function stockShop(state: GameState, profile: EconomyProfile): void {
  for (let shelfIndex = 0; shelfIndex < state.shopShelves.length; shelfIndex++) {
    if (state.shopShelves[shelfIndex]) continue;
    const bagIndex = state.bag.findIndex((entry) => entry?.kind === 'loot');
    if (bagIndex < 0) break;
    const entry = state.bag[bagIndex];
    if (!entry || entry.kind !== 'loot') continue;
    const quantity = Math.min(profile.listingBatch, entry.quantity);
    const listingEntry = { ...entry, quantity };
    entry.quantity -= quantity;
    if (entry.quantity <= 0) state.bag[bagIndex] = null;
    state.shopShelves[shelfIndex] = {
      entry: listingEntry,
      price: Math.max(1, Math.round(bagEntryTotalValue(listingEntry) * profile.priceRatio)),
      slotIndex: shelfIndex,
      isCage: false,
    };
  }

  for (let cageIndex = 0; cageIndex < state.shopCages.length; cageIndex++) {
    if (state.shopCages[cageIndex]) continue;
    const bagIndex = state.bag.findIndex((entry) => entry?.kind === 'creature');
    if (bagIndex < 0) break;
    const entry = state.bag[bagIndex];
    if (!entry || entry.kind !== 'creature') continue;
    state.bag[bagIndex] = null;
    state.shopCages[cageIndex] = {
      entry,
      price: Math.max(1, Math.round(entry.baseValue * profile.priceRatio)),
      slotIndex: cageIndex,
      isCage: true,
    };
  }
}

function replenishOrbs(state: GameState): number {
  if (state.orbs >= 3) return 0;
  const before = state.gold;
  if (!buyOrbPack(state, 'bundle')) buyOrbPack(state, 'single');
  return before - state.gold;
}

function upgradeWithReserve(state: GameState): void {
  const next = getNextShopLevel(state.shopLevel);
  if (!next || state.gold - next.upgradeCost < 70) return;
  tryUpgradeShop(state);
}

function inventoryValue(state: GameState): number {
  const bagValue = state.bag.reduce(
    (sum, entry) => sum + (entry ? bagEntryTotalValue(entry) : 0),
    0,
  );
  const displayValue = [...state.shopShelves, ...state.shopCages].reduce(
    (sum, listing) => sum + (listing ? bagEntryTotalValue(listing.entry) : 0),
    0,
  );
  return bagValue + displayValue;
}

function simulateTenCycles(profile: EconomyProfile): EconomyReport {
  const state = defaultGameState();
  state.tutorialComplete = true;
  state.tutorialStep = 'done';
  const rng = seededRng(
    profile.id === 'conservador' ? 11 : profile.id === 'normal' ? 29 : 47,
  );
  const crafted = new Set<string>();
  let minimumGold = state.gold;
  let shopRevenue = 0;
  let orbSpend = 0;
  let craftSpend = 0;
  let missedCaptures = 0;

  for (let day = 0; day < BIOME_SCHEDULE.length; day++) {
    const biomeId = BIOME_SCHEDULE[day]!;
    state.dungeonUsedToday = true;
    state.dungeonReturnedToday = true;
    grantDungeonLoot(state, biomeId, profile.lootMultiplier);

    if (day % profile.captureEvery === 0 && !captureCreature(state, biomeId, day)) {
      missedCaptures += 1;
    }

    craftSpend += tryCraftGoals(state, profile, crafted);
    stockShop(state, profile);
    const shop = runShopDay(state, rng);
    shopRevenue += shop.goldEarned;
    state.shopDayUsed = true;
    orbSpend += replenishOrbs(state);
    upgradeWithReserve(state);
    minimumGold = Math.min(minimumGold, state.gold);
    endDay(state);
  }

  return {
    profile: profile.id,
    days: BIOME_SCHEDULE.length,
    finalGold: state.gold,
    minimumGold,
    finalOrbs: state.orbs,
    shopRevenue,
    orbSpend,
    craftSpend,
    missedCaptures,
    crafted: [...crafted],
    shopLevel: state.shopLevel,
    reputationLevel: getReputationLevel(state.shopGoldSold),
    netWorth: state.gold + inventoryValue(state),
  };
}

describe('economia em dez ciclos', () => {
  it.each(PROFILES)('$id permanece jogável sem inflação explosiva', (profile) => {
    const report = simulateTenCycles(profile);

    expect(report.days).toBe(10);
    expect(report.minimumGold).toBeGreaterThanOrEqual(0);
    expect(report.finalOrbs).toBeGreaterThan(0);
    expect(report.missedCaptures).toBe(0);
    expect(report.shopRevenue).toBeGreaterThan(report.orbSpend);
    expect(report.reputationLevel).toBeGreaterThanOrEqual(2);
    expect(report.netWorth).toBeGreaterThan(250);
    expect(report.netWorth).toBeLessThan(15_000);
  });

  it('perfil normal financia equipamento e uma loja melhor sem depender de ouro artificial', () => {
    const report = simulateTenCycles(PROFILES[1]!);

    expect(report.crafted).toContain('craft_picareta');
    expect(report.crafted.some((id) => id.startsWith('craft_capuz_'))).toBe(true);
    expect(report.craftSpend).toBeGreaterThan(0);
    expect(report.orbSpend).toBeGreaterThan(0);
    expect(report.shopLevel).toBeGreaterThanOrEqual(2);
    expect(report.finalGold).toBeLessThan(report.shopRevenue);
  });

  it('receitas de conversão não permitem fabricar e revender com lucro infinito', () => {
    const conversionRecipes = CRAFT_RECIPES.filter((recipe) => recipe.output.kind === 'loot');
    expect(conversionRecipes.length).toBeGreaterThan(0);

    for (const recipe of conversionRecipes) {
      if (recipe.output.kind !== 'loot') continue;
      const ingredientValue = recipe.ingredients.reduce(
        (sum, ingredient) =>
          sum + (LOOT_TABLE[ingredient.lootId]?.baseValue ?? 0) * ingredient.quantity,
        recipe.goldCost,
      );
      const outputValue =
        (LOOT_TABLE[recipe.output.lootId]?.baseValue ?? 0) * recipe.output.quantity;
      expect(
        outputValue,
        `${recipe.name} não pode valer mais que ingredientes + ouro`,
      ).toBeLessThanOrEqual(ingredientValue);
    }
  });
});
