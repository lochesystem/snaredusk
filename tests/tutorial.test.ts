import { describe, expect, it } from 'vitest';
import { deserializeState, serializeState } from '../src/systems/saveManager.ts';
import {
  advanceTutorial,
  canEnterDungeonDuringTutorial,
  canOpenShopDuringTutorial,
  canStartShopDayDuringTutorial,
  canUseBuildTool,
  completeTutorial,
  isTutorialActive,
  shouldShowTutorialDialog,
  shouldBlockTutorialGameplay,
  shouldUseTutorialDungeon,
} from '../src/systems/tutorial.ts';
import { defaultGameState } from '../src/types.ts';
import { isOnWalkableFloor, PLAYER_RADIUS } from '../src/world/collision.ts';
import { generateTutorialDungeon, TUTORIAL_ENEMY_MAX_HP } from '../src/world/tutorialDungeon.ts';

function freshState() {
  return defaultGameState();
}

describe('tutorial system', () => {
  it('starts active on new game', () => {
    const state = freshState();
    expect(isTutorialActive(state)).toBe(true);
    expect(state.tutorialStep).toBe('welcome');
    expect(state.tutorialComplete).toBe(false);
  });

  it('advances welcome → go_portal on dialog_next', () => {
    const state = freshState();
    const result = advanceTutorial(state, 'dialog_next');
    expect(result.advanced).toBe(true);
    expect(state.tutorialStep).toBe('go_portal');
  });

  it('advances go_portal → dungeon_move on dungeon_entered', () => {
    const state = freshState();
    state.tutorialStep = 'go_portal';
    advanceTutorial(state, 'dungeon_entered');
    expect(state.tutorialStep).toBe('dungeon_move');
  });

  it('advances dungeon_move → dungeon_attack on dialog_next', () => {
    const state = freshState();
    state.tutorialStep = 'dungeon_move';
    advanceTutorial(state, 'dialog_next');
    expect(state.tutorialStep).toBe('dungeon_attack');
  });

  it('advances to dungeon_capture on enemy_damaged', () => {
    const state = freshState();
    state.tutorialStep = 'dungeon_attack';
    advanceTutorial(state, 'enemy_damaged');
    expect(state.tutorialStep).toBe('dungeon_capture');
  });

  it('advances to dungeon_exit on capture_success or enemy_defeated', () => {
    for (const event of ['capture_success', 'enemy_defeated'] as const) {
      const state = freshState();
      state.tutorialStep = 'dungeon_capture';
      advanceTutorial(state, event);
      expect(state.tutorialStep).toBe('dungeon_exit');
    }
  });

  it('advances dungeon_exit → return_home on returned_to_base', () => {
    const state = freshState();
    state.tutorialStep = 'dungeon_exit';
    advanceTutorial(state, 'returned_to_base');
    expect(state.tutorialStep).toBe('return_home');
  });

  it('advances return_home → build_habitat on dialog_next', () => {
    const state = freshState();
    state.tutorialStep = 'return_home';
    const result = advanceTutorial(state, 'dialog_next');
    expect(result.advanced).toBe(true);
    expect(result.completed).toBe(false);
    expect(state.tutorialStep).toBe('build_habitat');
  });

  it('advances PR2 base steps through habitat, shop and orbes', () => {
    const state = freshState();
    state.tutorialStep = 'build_habitat';
    advanceTutorial(state, 'habitat_pen_placed');
    expect(state.tutorialStep).toBe('place_creature');

    advanceTutorial(state, 'creature_placed');
    expect(state.tutorialStep).toBe('shop_stock');

    advanceTutorial(state, 'shop_item_stocked');
    expect(state.tutorialStep).toBe('shop_sell');

    advanceTutorial(state, 'shop_day_finished');
    expect(state.tutorialStep).toBe('buy_orbes');

    const result = advanceTutorial(state, 'orbes_purchased');
    expect(result.completed).toBe(true);
    expect(state.tutorialComplete).toBe(true);
    expect(state.tutorialStep).toBe('done');
  });

  it('skip marks tutorial complete', () => {
    const state = freshState();
    state.tutorialStep = 'dungeon_capture';
    const result = advanceTutorial(state, 'skip');
    expect(result.completed).toBe(true);
    expect(state.tutorialComplete).toBe(true);
    expect(state.tutorialStep).toBe('done');
  });

  it('completeTutorial helper marks done', () => {
    const state = freshState();
    completeTutorial(state);
    expect(state.tutorialComplete).toBe(true);
    expect(state.tutorialStep).toBe('done');
    expect(isTutorialActive(state)).toBe(false);
  });

  it('shouldUseTutorialDungeon during go_portal and dungeon steps only', () => {
    const state = freshState();
    expect(shouldUseTutorialDungeon(state)).toBe(false);

    state.tutorialStep = 'go_portal';
    expect(shouldUseTutorialDungeon(state)).toBe(true);

    state.tutorialStep = 'dungeon_move';
    expect(shouldUseTutorialDungeon(state)).toBe(true);

    state.tutorialStep = 'return_home';
    expect(shouldUseTutorialDungeon(state)).toBe(false);

    state.tutorialStep = 'shop_stock';
    expect(shouldUseTutorialDungeon(state)).toBe(false);
  });

  it('canEnterDungeonDuringTutorial mirrors dungeon access steps', () => {
    const state = freshState();
    state.tutorialStep = 'welcome';
    expect(canEnterDungeonDuringTutorial(state)).toBe(false);

    state.tutorialStep = 'go_portal';
    expect(canEnterDungeonDuringTutorial(state)).toBe(true);

    state.tutorialStep = 'dungeon_exit';
    expect(canEnterDungeonDuringTutorial(state)).toBe(true);

    state.tutorialStep = 'build_habitat';
    expect(canEnterDungeonDuringTutorial(state)).toBe(false);
  });

  it('canOpenShopDuringTutorial only on shop steps', () => {
    const state = freshState();
    state.tutorialStep = 'place_creature';
    expect(canOpenShopDuringTutorial(state)).toBe(false);

    state.tutorialStep = 'shop_stock';
    expect(canOpenShopDuringTutorial(state)).toBe(true);

    state.tutorialStep = 'shop_sell';
    expect(canOpenShopDuringTutorial(state)).toBe(true);

    completeTutorial(state);
    expect(canOpenShopDuringTutorial(state)).toBe(true);
  });

  it('canStartShopDayDuringTutorial only on shop_sell', () => {
    const state = freshState();
    state.tutorialStep = 'shop_stock';
    expect(canStartShopDayDuringTutorial(state)).toBe(false);

    state.tutorialStep = 'shop_sell';
    expect(canStartShopDayDuringTutorial(state)).toBe(true);
  });

  it('canUseBuildTool only allows habitat pen during build_habitat', () => {
    const state = freshState();
    state.tutorialStep = 'build_habitat';
    expect(canUseBuildTool(state, 'habitat_pen')).toBe(true);
    expect(canUseBuildTool(state, 'workbench')).toBe(false);
    expect(canUseBuildTool(state, 'move')).toBe(false);

    state.tutorialStep = 'place_creature';
    expect(canUseBuildTool(state, 'habitat_pen')).toBe(false);
  });

  it('shouldShowTutorialDialog for actionable steps', () => {
    const state = freshState();
    expect(shouldShowTutorialDialog(state)).toBe(true);

    state.tutorialStep = 'go_portal';
    expect(shouldShowTutorialDialog(state)).toBe(true);

    state.tutorialStep = 'dungeon_capture';
    expect(shouldShowTutorialDialog(state)).toBe(true);

    state.tutorialStep = 'build_habitat';
    expect(shouldShowTutorialDialog(state)).toBe(true);

    state.tutorialStep = 'done';
    expect(shouldShowTutorialDialog(state)).toBe(false);
  });

  it('shouldBlockTutorialGameplay only on welcome and return_home', () => {
    const state = freshState();
    expect(shouldBlockTutorialGameplay(state)).toBe(true);

    state.tutorialStep = 'go_portal';
    expect(shouldBlockTutorialGameplay(state)).toBe(false);

    state.tutorialStep = 'dungeon_attack';
    expect(shouldBlockTutorialGameplay(state)).toBe(false);

    state.tutorialStep = 'dungeon_capture';
    expect(shouldBlockTutorialGameplay(state)).toBe(false);

    state.tutorialStep = 'return_home';
    expect(shouldBlockTutorialGameplay(state)).toBe(true);

    state.tutorialStep = 'build_habitat';
    expect(shouldBlockTutorialGameplay(state)).toBe(false);
  });
});

describe('tutorial save migration', () => {
  it('legacy saves without tutorial fields skip tutorial', () => {
    const legacy = defaultGameState();
    delete (legacy as { tutorialComplete?: boolean }).tutorialComplete;
    delete (legacy as { tutorialStep?: string }).tutorialStep;
    const raw = JSON.stringify({ version: 7, state: legacy });
    const loaded = deserializeState(raw);
    expect(loaded).not.toBeNull();
    expect(loaded!.tutorialComplete).toBe(true);
    expect(loaded!.tutorialStep).toBe('done');
  });

  it('round-trips tutorial progress', () => {
    const state = freshState();
    state.tutorialStep = 'dungeon_capture';
    const loaded = deserializeState(serializeState(state));
    expect(loaded?.tutorialStep).toBe('dungeon_capture');
    expect(loaded?.tutorialComplete).toBe(false);
  });
});

describe('generateTutorialDungeon', () => {
  it('has one combat room and one enemy spawn', () => {
    const layout = generateTutorialDungeon('floresta');
    expect(layout.rooms).toHaveLength(1);
    expect(layout.rooms[0]!.type).toBe('combat');
    expect(layout.enemySpawns).toHaveLength(1);
    expect(layout.enemySpawns[0]!.speciesId).toBe('esporo_dorminhoco');
    expect(layout.enemySpawns[0]!.hp).toBe(TUTORIAL_ENEMY_MAX_HP);
    expect(layout.hazards).toHaveLength(0);
    expect(layout.bossGateWalls).toHaveLength(0);
    expect(layout.bossRoomIndex).toBe(-1);
  });

  it('spawn and enemy positions are walkable', () => {
    const layout = generateTutorialDungeon();
    expect(isOnWalkableFloor(layout.spawn.x, layout.spawn.y, PLAYER_RADIUS, layout.floors)).toBe(true);
    const enemy = layout.enemySpawns[0]!;
    expect(isOnWalkableFloor(enemy.x, enemy.y, PLAYER_RADIUS, layout.floors)).toBe(true);
  });
});
