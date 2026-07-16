import { SAVE_KEY } from '../engine/constants.ts';
import { createEmptyBag, defaultGameState, type GameState } from '../types.ts';

const SAVE_VERSION = 1;

interface SavePayload {
  version: number;
  state: GameState;
}

export function serializeState(state: GameState): string {
  const payload: SavePayload = { version: SAVE_VERSION, state };
  return JSON.stringify(payload);
}

export function deserializeState(raw: string): GameState | null {
  try {
    const payload = JSON.parse(raw) as SavePayload;
    if (payload.version !== SAVE_VERSION || !payload.state) return null;
    return normalizeState(payload.state);
  } catch {
    return null;
  }
}

function normalizeState(partial: GameState): GameState {
  const base = defaultGameState();
  return {
    ...base,
    ...partial,
    bag: padBag(partial.bag),
    shopShelves: padShelves(partial.shopShelves),
    habitat: partial.habitat ?? [],
    bestiary: partial.bestiary ?? [],
  };
}

function padBag(bag: (GameState['bag'][number] | null)[] | undefined): GameState['bag'] {
  const slots = createEmptyBag();
  if (!bag) return slots;
  for (let i = 0; i < Math.min(bag.length, slots.length); i++) {
    slots[i] = bag[i] ?? null;
  }
  return slots;
}

function padShelves(shelves: (GameState['shopShelves'][number] | null)[] | undefined): GameState['shopShelves'] {
  const slots: GameState['shopShelves'] = [null, null, null];
  if (!shelves) return slots;
  for (let i = 0; i < 3; i++) {
    slots[i] = shelves[i] ?? null;
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
