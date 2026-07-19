import type { BiomeId } from '../data/biomes.ts';

const VICTORY_TITLES: Record<BiomeId, string> = {
  floresta: 'Infestação Eliminada',
  cristal: 'Cristal Purificado',
  termal: 'Chama Antiga Extinguida',
};

let overlay: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function getBossVictoryTitle(biomeId: BiomeId): string {
  return VICTORY_TITLES[biomeId];
}

export function showBossVictory(biomeId: BiomeId, bossName: string, durationMs = 3200): void {
  hideBossVictory();
  const title = getBossVictoryTitle(biomeId);
  overlay = document.createElement('div');
  overlay.className = 'boss-victory-overlay';
  overlay.innerHTML = `
    <div class="boss-victory-content">
      <p class="boss-victory-title">${title}</p>
      <p class="boss-victory-sub">${bossName}</p>
      <div class="boss-victory-line"></div>
    </div>
  `;
  document.getElementById('game-wrapper')?.appendChild(overlay);
  requestAnimationFrame(() => overlay?.classList.add('visible'));
  hideTimer = setTimeout(() => hideBossVictory(), durationMs);
}

export function hideBossVictory(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (!overlay) return;
  overlay.classList.remove('visible');
  const el = overlay;
  overlay = null;
  setTimeout(() => el.remove(), 600);
}
