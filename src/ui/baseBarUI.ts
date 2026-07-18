import type { GameState } from '../types.ts';
import { bagCount } from '../systems/saveManager.ts';
import { getHabitatCapacity } from '../systems/habitat.ts';

export interface BaseBarCallbacks {
  getState: () => GameState;
  onParty: () => void;
  onOrbs: () => void;
}

export function renderBaseHeader(state: GameState): void {
  const stats = document.getElementById('base-hub-stats');
  if (!stats) return;
  const inHabitat = state.habitat.length;
  const cap = getHabitatCapacity(state);
  const shopNote = state.shopDayUsed ? ' · Loja fechada' : '';
  stats.textContent =
    `Ouro: ${state.gold} · Orbes: ${state.orbs} · STA: ${Math.round(state.playerStamina)} · Bolsa: ${bagCount(state)}/12 · Habitat: ${inHabitat}/${cap} · Dia 1${shopNote}`;
}

export function bindBaseBar(callbacks: BaseBarCallbacks): void {
  document.getElementById('btn-base-party')?.addEventListener('click', () => callbacks.onParty());
  document.getElementById('btn-base-orbs')?.addEventListener('click', () => callbacks.onOrbs());
}

export function setBaseHint(text: string): void {
  const el = document.getElementById('base-hub-hint');
  if (el) el.textContent = text;
}

export function showBaseHub(visible: boolean): void {
  document.getElementById('base-hub')?.classList.toggle('hidden', !visible);
}
