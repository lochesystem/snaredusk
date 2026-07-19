import type { DayEndResult } from '../systems/dayCycle.ts';
import { aggregateYieldResults } from '../systems/habitatProduction.ts';

export interface DayTransitionPayload {
  result: DayEndResult;
  footer?: string;
}

export interface DayTransitionContent {
  dayNumber: number;
  lines: string[];
  warning?: string;
  footer?: string;
}

const TIMING = {
  darken: 750,
  reveal: 900,
  hold: 2600,
  exit: 800,
} as const;

let overlay: HTMLDivElement | null = null;
let playing = false;

export function buildDayTransitionContent(
  result: DayEndResult,
  footer?: string,
): DayTransitionContent {
  const lines: string[] = [];

  if (result.collected.length === 0) {
    lines.push('O habitat descansou em silêncio esta noite.');
  } else {
    const summary = aggregateYieldResults(result.collected)
      .map((y) => `+${y.quantity} ${y.lootName}`)
      .join(' · ');
    lines.push(`Habitat: ${summary}`);
  }

  let warning: string | undefined;
  if (result.overflow.length > 0) {
    const lost = aggregateYieldResults(result.overflow)
      .map((y) => `+${y.quantity} ${y.lootName}`)
      .join(' · ');
    warning = `Bolsa cheia — perdeu ${lost}`;
  }

  return {
    dayNumber: result.newDay,
    lines,
    warning,
    footer: footer?.trim() || undefined,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createOverlay(content: DayTransitionContent): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'day-transition-overlay';
  root.setAttribute('aria-live', 'polite');

  const sky = document.createElement('div');
  sky.className = 'day-transition-sky';

  const glow = document.createElement('div');
  glow.className = 'day-transition-glow';
  sky.appendChild(glow);

  const stars = document.createElement('div');
  stars.className = 'day-transition-stars';
  sky.appendChild(stars);

  root.appendChild(sky);

  const panel = document.createElement('div');
  panel.className = 'day-transition-content';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'day-transition-eyebrow';
  eyebrow.textContent = 'Amanhecer em Brumavale';
  panel.appendChild(eyebrow);

  const day = document.createElement('h2');
  day.className = 'day-transition-day';
  day.textContent = `Dia ${content.dayNumber}`;
  panel.appendChild(day);

  const line = document.createElement('div');
  line.className = 'day-transition-line';
  panel.appendChild(line);

  for (const text of content.lines) {
    const detail = document.createElement('p');
    detail.className = 'day-transition-detail';
    detail.textContent = text;
    panel.appendChild(detail);
  }

  if (content.warning) {
    const warning = document.createElement('p');
    warning.className = 'day-transition-warning';
    warning.textContent = content.warning;
    panel.appendChild(warning);
  }

  if (content.footer) {
    const footer = document.createElement('p');
    footer.className = 'day-transition-footer';
    footer.textContent = content.footer;
    panel.appendChild(footer);
  }

  root.appendChild(panel);
  return root;
}

export function isDayTransitionPlaying(): boolean {
  return playing;
}

export function cancelDayTransition(): void {
  playing = false;
  if (!overlay) return;
  overlay.remove();
  overlay = null;
}

export async function playDayTransition(payload: DayTransitionPayload): Promise<void> {
  if (playing) return;

  const app = document.getElementById('app');
  if (!app) return;

  playing = true;
  const content = buildDayTransitionContent(payload.result, payload.footer);
  overlay = createOverlay(content);
  app.appendChild(overlay);

  await wait(30);
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
