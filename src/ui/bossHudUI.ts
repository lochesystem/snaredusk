import { calcBossHpBarFills, type BossCombatPhase } from '../systems/bossPhase.ts';

export interface BossHudState {
  name: string;
  hp: number;
  maxHp: number;
  shieldHp: number;
  shieldMax: number;
  phase: BossCombatPhase;
}

let root: HTMLElement | null = null;
let nameEl: HTMLElement | null = null;
let phase1Fill: HTMLElement | null = null;
let phase2Fill: HTMLElement | null = null;
let shieldFill: HTMLElement | null = null;
let shieldTrack: HTMLElement | null = null;

function ensureElements(): void {
  if (root) return;
  root = document.getElementById('boss-hud');
  nameEl = document.getElementById('boss-hud-name');
  phase1Fill = document.getElementById('boss-hud-phase1');
  phase2Fill = document.getElementById('boss-hud-phase2');
  shieldFill = document.getElementById('boss-hud-shield');
  shieldTrack = document.getElementById('boss-hud-shield-track');
}

export function showBossHud(state: BossHudState): void {
  ensureElements();
  if (!root) return;
  root.classList.remove('hidden');
  root.classList.toggle('phase-2', state.phase === 2);
  applyBossHudState(state);
}

export function updateBossHud(state: BossHudState): void {
  ensureElements();
  if (!root || root.classList.contains('hidden')) return;
  root.classList.toggle('phase-2', state.phase === 2);
  applyBossHudState(state);
}

export function hideBossHud(): void {
  ensureElements();
  root?.classList.add('hidden');
  root?.classList.remove('phase-2', 'phase-flash');
}

export function flashPhaseTransition(): void {
  ensureElements();
  if (!root) return;
  root.classList.remove('phase-flash');
  void root.offsetWidth;
  root.classList.add('phase-flash');
}

export function applyBossHudState(state: BossHudState): void {
  if (nameEl) nameEl.textContent = state.name;
  const fills = calcBossHpBarFills(state.hp, state.maxHp);
  if (phase1Fill) phase1Fill.style.width = `${fills.phase1 * 100}%`;
  if (phase2Fill) phase2Fill.style.width = `${fills.phase2 * 100}%`;

  const hasShield = state.shieldMax > 0 && state.shieldHp > 0;
  if (shieldTrack) shieldTrack.classList.toggle('hidden', !hasShield);
  if (shieldFill && state.shieldMax > 0) {
    const shRatio = Math.max(0, Math.min(1, state.shieldHp / state.shieldMax));
    shieldFill.style.width = `${shRatio * 100}%`;
  }
}
