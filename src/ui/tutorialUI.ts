import type { GameState } from '../types.ts';
import {
  advanceTutorial,
  getTutorialDialog,
  shouldShowTutorialDialog,
  type TutorialEvent,
  type TutorialHighlight,
} from '../systems/tutorial.ts';

export interface TutorialUIHandlers {
  getState: () => GameState;
  onContinue: (event: TutorialEvent) => void;
  onSkip: () => void;
}

let overlay: HTMLDivElement | null = null;
let handlers: TutorialUIHandlers | null = null;
let visible = false;

export function bindTutorialUI(h: TutorialUIHandlers): void {
  handlers = h;
}

export function isTutorialDialogOpen(): boolean {
  return visible;
}

export function hideTutorialDialog(): void {
  visible = false;
  overlay?.classList.remove('visible');
  overlay?.classList.add('hidden');
  clearHighlights();
}

export function syncTutorialDialog(state: GameState): void {
  if (!shouldShowTutorialDialog(state)) {
    hideTutorialDialog();
    return;
  }
  const content = getTutorialDialog(state);
  if (!content) {
    hideTutorialDialog();
    return;
  }
  showTutorialDialog(content);
}

export function refreshTutorialDialog(): void {
  const state = handlers?.getState();
  if (!state) return;
  syncTutorialDialog(state);
}

function ensureOverlay(): HTMLDivElement {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.className = 'tutorial-overlay hidden';
  overlay.innerHTML = `
    <div class="tutorial-panel">
      <div class="tutorial-portrait" aria-hidden="true">M</div>
      <div class="tutorial-body">
        <p class="tutorial-name">Mira</p>
        <p class="tutorial-text"></p>
        <div class="tutorial-actions">
          <button type="button" class="tutorial-skip"></button>
          <button type="button" class="tutorial-continue">Continuar</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('game-wrapper')?.appendChild(overlay);

  overlay.querySelector('.tutorial-continue')?.addEventListener('click', () => {
    handlers?.onContinue('dialog_next');
  });
  overlay.querySelector('.tutorial-skip')?.addEventListener('click', () => {
    handlers?.onSkip();
  });

  return overlay;
}

function showTutorialDialog(content: {
  text: string;
  showSkip: boolean;
  showContinue: boolean;
  skipLabel: string;
  highlight: TutorialHighlight;
}): void {
  const root = ensureOverlay();
  const textEl = root.querySelector('.tutorial-text');
  const continueBtn = root.querySelector('.tutorial-continue') as HTMLButtonElement | null;
  const skipBtn = root.querySelector('.tutorial-skip') as HTMLButtonElement | null;
  if (textEl) textEl.textContent = content.text;
  if (continueBtn) {
    continueBtn.classList.toggle('hidden', !content.showContinue);
  }
  if (skipBtn) {
    skipBtn.classList.toggle('hidden', !content.showSkip);
    skipBtn.textContent = content.skipLabel || 'Pular tutorial';
  }
  applyHighlight(content.highlight);
  root.classList.remove('hidden');
  requestAnimationFrame(() => {
    root.classList.add('visible');
    visible = true;
  });
}

function clearHighlights(): void {
  document.getElementById('base-hub-hint')?.classList.remove('tutorial-highlight');
  document.getElementById('hud-hint')?.classList.remove('tutorial-highlight');
  document.getElementById('hud-orbs')?.classList.remove('tutorial-highlight');
}

function applyHighlight(highlight: TutorialHighlight): void {
  clearHighlights();
  if (highlight === 'portal') {
    document.getElementById('base-hub-hint')?.classList.add('tutorial-highlight');
  } else if (highlight === 'capture_q') {
    document.getElementById('hud-hint')?.classList.add('tutorial-highlight');
    document.getElementById('hud-orbs')?.classList.add('tutorial-highlight');
  }
}

export function destroyTutorialUI(): void {
  hideTutorialDialog();
  overlay?.remove();
  overlay = null;
  handlers = null;
}

/** Utilitário para testes — avanço direto. */
export function applyTutorialEventForTest(state: GameState, event: TutorialEvent) {
  return advanceTutorial(state, event);
}
