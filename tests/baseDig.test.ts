import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { canDigCell, digCell } from '../src/systems/baseDig.ts';
import { BaseCellKind, cellToWorld, getCell, isAdjacentToPlayer } from '../src/world/baseGrid.ts';
import { BASE_DIG_STAMINA_COST } from '../src/engine/constants.ts';

describe('baseDig', () => {
  it('escava rocha adjacente ao jogador', () => {
    const state = defaultGameState();
    let rockCell: { x: number; y: number } | null = null;
    let floorCell: { x: number; y: number } | null = null;

    for (let y = 0; y < state.base.height; y++) {
      for (let x = 0; x < state.base.width; x++) {
        if (getCell(state.base, x, y) !== BaseCellKind.Rock) continue;
        const neighbors = [
          { x: x + 1, y },
          { x: x - 1, y },
          { x, y: y + 1 },
          { x, y: y - 1 },
        ];
        for (const n of neighbors) {
          if (getCell(state.base, n.x, n.y) === BaseCellKind.Floor) {
            rockCell = { x, y };
            floorCell = n;
            break;
          }
        }
        if (rockCell) break;
      }
      if (rockCell) break;
    }

    expect(rockCell).not.toBeNull();
    expect(floorCell).not.toBeNull();

    const floorWorld = cellToWorld(floorCell!.x, floorCell!.y);
    state.playerStamina = BASE_DIG_STAMINA_COST;
    expect(isAdjacentToPlayer(rockCell!.x, rockCell!.y, floorWorld.x, floorWorld.y)).toBe(true);
    expect(canDigCell(state, rockCell!.x, rockCell!.y, floorWorld.x, floorWorld.y)).toBe(true);
    expect(digCell(state, rockCell!.x, rockCell!.y, floorWorld.x, floorWorld.y)).toBe(true);
    expect(getCell(state.base, rockCell!.x, rockCell!.y)).toBe(BaseCellKind.Floor);
  });

  it('não escava sem stamina', () => {
    const state = defaultGameState();
    state.playerStamina = 0;
    expect(digCell(state, 5, 5, 5 * 32, 5 * 32)).toBe(false);
  });
});
