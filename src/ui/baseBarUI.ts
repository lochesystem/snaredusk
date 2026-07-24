import type { GameState } from '../types.ts';
import { bagCount } from '../systems/saveManager.ts';
import { getHabitatCapacity } from '../systems/habitat.ts';

export interface BaseBarCallbacks {
  getState: () => GameState;
  onParty: () => void;
  onBestiary: () => void;
  onOrbs: () => void;
  onOptions: () => void;
}

export function renderBaseHeader(state: GameState): void {
  const stats = document.getElementById('base-hub-stats');
  if (!stats) return;
  const inHabitat = state.habitat.length;
  const cap = getHabitatCapacity(state);
  const values = [
    ['Ouro', String(state.gold), 'gold'],
    ['Orbes', String(state.orbs), 'orbs'],
    ['STA', String(Math.round(state.playerStamina)), 'stamina'],
    ['Bolsa', `${bagCount(state)}/12`, 'bag'],
    ['Habitat', `${inHabitat}/${cap}`, 'habitat'],
    ['Dia', String(state.dayNumber), 'day'],
  ] as const;
  stats.replaceChildren(...values.map(([label, value, kind]) => {
    const chip = document.createElement('span');
    chip.className = `base-stat-chip base-stat-${kind}`;
    const labelEl = document.createElement('small');
    labelEl.textContent = label;
    const valueEl = document.createElement('strong');
    valueEl.textContent = value;
    chip.append(labelEl, valueEl);
    return chip;
  }));
  stats.classList.toggle('shop-closed', state.shopDayUsed);
}

export function bindBaseBar(callbacks: BaseBarCallbacks): void {
  document.getElementById('btn-base-party')?.addEventListener('click', () => callbacks.onParty());
  document.getElementById('btn-base-bestiary')?.addEventListener('click', () => callbacks.onBestiary());
  document.getElementById('btn-base-orbs')?.addEventListener('click', () => callbacks.onOrbs());
  document.getElementById('btn-base-options')?.addEventListener('click', () => callbacks.onOptions());
}

export function setBaseHint(text: string): void {
  const el = document.getElementById('base-hub-hint');
  if (el) el.textContent = text;
}

export function showBaseHub(visible: boolean): void {
  document.getElementById('base-hub')?.classList.toggle('hidden', !visible);
}
