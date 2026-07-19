export interface DeathTransitionPayload {
  killerName: string;
}

const TIMING = {
  darken: 450,
  reveal: 500,
  hold: 1000,
  exit: 550,
} as const;

let overlay: HTMLDivElement | null = null;
let playing = false;

export function formatDeathKillerLine(killerName: string): string {
  const trimmed = killerName.trim();
  if (!trimmed) return 'Morto por forças desconhecidas';
  return `Morto por ${trimmed}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createOverlay(killerName: string): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'death-transition-overlay';
  root.setAttribute('aria-live', 'assertive');

  const veil = document.createElement('div');
  veil.className = 'death-transition-veil';
  root.appendChild(veil);

  const pulse = document.createElement('div');
  pulse.className = 'death-transition-pulse';
  root.appendChild(pulse);

  const panel = document.createElement('div');
  panel.className = 'death-transition-content';

  const title = document.createElement('h2');
  title.className = 'death-transition-title';
  title.textContent = 'Você morreu';
  panel.appendChild(title);

  const line = document.createElement('div');
  line.className = 'death-transition-line';
  panel.appendChild(line);

  const killer = document.createElement('p');
  killer.className = 'death-transition-killer';
  killer.textContent = formatDeathKillerLine(killerName);
  panel.appendChild(killer);

  root.appendChild(panel);
  return root;
}

export function isDeathTransitionPlaying(): boolean {
  return playing;
}

export function cancelDeathTransition(): void {
  playing = false;
  overlay?.remove();
  overlay = null;
}

export async function playDeathTransition(payload: DeathTransitionPayload): Promise<void> {
  if (playing) return;

  const app = document.getElementById('app');
  if (!app) return;

  playing = true;
  overlay = createOverlay(payload.killerName);
  app.appendChild(overlay);

  await wait(20);
  overlay.classList.add('visible');
  await wait(TIMING.darken);
  overlay.classList.add('show-content');
  await wait(TIMING.reveal + TIMING.hold);
  overlay.classList.add('exit');
  await wait(TIMING.exit);

  overlay.remove();
  overlay = null;
  playing = false;
}
