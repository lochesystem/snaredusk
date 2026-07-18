let overlay: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function showBossIntro(bossName: string, biomeName: string, durationMs = 2800): void {
  hideBossIntro();
  overlay = document.createElement('div');
  overlay.className = 'boss-intro-overlay';
  overlay.innerHTML = `
    <div class="boss-intro-content">
      <p class="boss-intro-biome">${biomeName}</p>
      <h2 class="boss-intro-name">${bossName}</h2>
      <div class="boss-intro-line"></div>
    </div>
  `;
  document.getElementById('game-wrapper')?.appendChild(overlay);
  requestAnimationFrame(() => overlay?.classList.add('visible'));
  hideTimer = setTimeout(() => hideBossIntro(), durationMs);
}

export function hideBossIntro(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (!overlay) return;
  overlay.classList.remove('visible');
  const el = overlay;
  overlay = null;
  setTimeout(() => el.remove(), 400);
}
