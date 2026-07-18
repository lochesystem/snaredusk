import type { GameState } from '../types.ts';
import { bagCount } from '../systems/saveManager.ts';
import { getHabitatCapacity } from '../systems/habitat.ts';

export interface BaseBarCallbacks {
  getState: () => GameState;
  onBuild: () => void;
  onBag: () => void;
  onParty: () => void;
  onDungeon: () => void;
  onShop: () => void;
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
  document.getElementById('btn-base-build')?.addEventListener('click', () => callbacks.onBuild());
  document.getElementById('btn-base-bag')?.addEventListener('click', () => callbacks.onBag());
  document.getElementById('btn-base-party')?.addEventListener('click', () => callbacks.onParty());
  document.getElementById('btn-base-dungeon')?.addEventListener('click', () => callbacks.onDungeon());
  document.getElementById('btn-base-shop')?.addEventListener('click', () => callbacks.onShop());
  document.getElementById('btn-base-orbs')?.addEventListener('click', () => callbacks.onOrbs());
}

export function updateBaseShopButton(state: GameState): void {
  const shopBtn = document.getElementById('btn-base-shop') as HTMLButtonElement | null;
  if (shopBtn) {
    shopBtn.textContent = state.shopDayUsed ? 'Loja (fechada)' : 'Loja';
  }
}

export function setBaseHint(text: string): void {
  const el = document.getElementById('base-hub-hint');
  if (el) el.textContent = text;
}

export function showBaseHub(visible: boolean): void {
  document.getElementById('base-hub')?.classList.toggle('hidden', !visible);
}
