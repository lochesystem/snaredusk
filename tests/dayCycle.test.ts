import { describe, expect, it } from 'vitest';
import { defaultGameState, type CreatureItem } from '../src/types.ts';
import { endDay, canEnterDungeonToday, canSleepToday, markDungeonReturned, syncDungeonDayFlagsAtBase } from '../src/systems/dayCycle.ts';
import { canPlaceHabitatPen, placeHabitatPen } from '../src/systems/baseBuild.ts';
import { BaseCellKind, getCell } from '../src/world/baseGrid.ts';
import { PLAYER_MAX_HP, PLAYER_MAX_STAMINA } from '../src/engine/constants.ts';

const esporo: CreatureItem = {
  kind: 'creature',
  speciesId: 'esporo_dorminhoco',
  name: 'Esporo Dorminhoco',
  baseValue: 40,
};

function addTestPen(state: ReturnType<typeof defaultGameState>) {
  let zone = { cellX: 0, cellY: 0, width: 2, height: 2 };
  outer: for (let y = 0; y < state.base.height; y++) {
    for (let x = 0; x < state.base.width; x++) {
      if (getCell(state.base, x, y) !== BaseCellKind.Floor) continue;
      const candidate = { cellX: x, cellY: y, width: 2, height: 2 };
      if (canPlaceHabitatPen(state, candidate).ok) {
        zone = candidate;
        break outer;
      }
    }
  }
  placeHabitatPen(state, zone);
  return state.base.placements.find((p) => p.stationId === 'habitat_pen')!.id;
}

describe('dayCycle', () => {
  it('endDay increments dayNumber, resets shopDayUsed, heals player, and collects production', () => {
    const state = defaultGameState();
    const penId = addTestPen(state);
    state.habitat = [{ ...esporo, penId }];
    state.shopDayUsed = true;
    state.dungeonUsedToday = true;
    state.dungeonReturnedToday = true;
    state.playerHp = 40;
    state.playerStamina = 20;

    const result = endDay(state);

    expect(state.dayNumber).toBe(2);
    expect(result.newDay).toBe(2);
    expect(state.shopDayUsed).toBe(false);
    expect(state.dungeonUsedToday).toBe(false);
    expect(state.dungeonReturnedToday).toBe(false);
    expect(state.playerHp).toBe(PLAYER_MAX_HP);
    expect(state.playerStamina).toBe(PLAYER_MAX_STAMINA);
    expect(result.collected).toHaveLength(1);
    expect(result.collected[0]?.lootId).toBe('fibra_musgo');
  });

  it('canEnterDungeonToday blocks after dungeon used', () => {
    const state = defaultGameState();
    expect(canEnterDungeonToday(state)).toBe(true);
    state.dungeonUsedToday = true;
    expect(canEnterDungeonToday(state)).toBe(false);
  });

  it('canSleepToday requires returning from dungeon', () => {
    const state = defaultGameState();
    expect(canSleepToday(state)).toBe(false);
    state.dungeonReturnedToday = true;
    expect(canSleepToday(state)).toBe(true);
  });

  it('markDungeonReturned enables sleep', () => {
    const state = defaultGameState();
    state.dungeonUsedToday = true;
    markDungeonReturned(state);
    expect(state.dungeonReturnedToday).toBe(true);
    expect(canSleepToday(state)).toBe(true);
  });

  it('syncDungeonDayFlagsAtBase heals inconsistent save when player is at base', () => {
    const state = defaultGameState();
    state.dungeonUsedToday = true;
    state.dungeonReturnedToday = false;

    expect(syncDungeonDayFlagsAtBase(state)).toBe(true);
    expect(state.dungeonReturnedToday).toBe(true);
    expect(canSleepToday(state)).toBe(true);
    expect(syncDungeonDayFlagsAtBase(state)).toBe(false);
  });

  it('syncDungeonDayFlagsAtBase does nothing when flags are consistent', () => {
    const fresh = defaultGameState();
    expect(syncDungeonDayFlagsAtBase(fresh)).toBe(false);

    const returned = defaultGameState();
    returned.dungeonUsedToday = true;
    returned.dungeonReturnedToday = true;
    expect(syncDungeonDayFlagsAtBase(returned)).toBe(false);
  });
});
