let overlay: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const FLOOR_PORTAL_REVEAL_TITLE = 'A passagem despertou';
export const FLOOR_PORTAL_REVEAL_SUBTITLE =
  'O portal surgiu em uma sala silenciosa';

export function showFloorPortalReveal(durationMs = 3200): void {
  hideFloorPortalReveal();
  overlay = document.createElement('div');
  overlay.className = 'floor-portal-reveal';
  overlay.innerHTML = `
    <div class="floor-portal-reveal-content">
      <span class="floor-portal-reveal-rune" aria-hidden="true">✦</span>
      <p class="floor-portal-reveal-title">${FLOOR_PORTAL_REVEAL_TITLE}</p>
      <p class="floor-portal-reveal-sub">${FLOOR_PORTAL_REVEAL_SUBTITLE}</p>
      <p class="floor-portal-reveal-map">A marca azul no mapa mostra o caminho</p>
    </div>
  `;
  document.getElementById('game-wrapper')?.appendChild(overlay);
  requestAnimationFrame(() => overlay?.classList.add('visible'));
  hideTimer = setTimeout(() => hideFloorPortalReveal(), durationMs);
}

export function hideFloorPortalReveal(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (!overlay) return;
  overlay.classList.remove('visible');
  const previous = overlay;
  overlay = null;
  setTimeout(() => previous.remove(), 500);
}
