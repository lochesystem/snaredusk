import type { GameState, TutorialStepId } from '../types.ts';

export type TutorialEvent =
  | 'dialog_next'
  | 'portal_opened'
  | 'dungeon_entered'
  | 'enemy_damaged'
  | 'capture_attempted'
  | 'capture_success'
  | 'enemy_defeated'
  | 'returned_to_base'
  | 'skip';

export type TutorialHighlight = 'portal' | 'capture_q' | null;

export interface TutorialDialogContent {
  step: TutorialStepId;
  text: string;
  showSkip: boolean;
  showContinue: boolean;
  skipLabel: string;
  highlight: TutorialHighlight;
}

const DUNGEON_STEPS: TutorialStepId[] = [
  'dungeon_move',
  'dungeon_attack',
  'dungeon_capture',
  'dungeon_exit',
];

const STEP_COPY: Record<TutorialStepId, Omit<TutorialDialogContent, 'step'>> = {
  welcome: {
    text: 'Bem-vindo a Brumavale. Herdei esta loja de um mercador que sumiu — e você herdou o turno da noite. Eu sou a Mira. Criaturas do subsolo valem ouro, aliados e segredos. Vamos começar pela masmorra?',
    showSkip: true,
    showContinue: true,
    skipLabel: 'Pular tutorial',
    highlight: null,
  },
  go_portal: {
    text: 'O portal fica na base. Aproxime-se e pressione [E] para escolher o destino e entrar na Floresta Fúngica.',
    showSkip: true,
    showContinue: false,
    skipLabel: 'Pular tutorial',
    highlight: 'portal',
  },
  dungeon_move: {
    text: 'Use WASD para se mover. Um Esporo Dorminhoco está à frente — aproxime-se com cuidado.',
    showSkip: true,
    showContinue: true,
    skipLabel: 'Seguir sozinho',
    highlight: null,
  },
  dungeon_attack: {
    text: 'Clique no esporo para atacar. Quanto mais fraco o inimigo, maior a chance de captura com o Orbe.',
    showSkip: true,
    showContinue: true,
    skipLabel: 'Seguir sozinho',
    highlight: null,
  },
  dungeon_capture: {
    text: 'Pressione [Q] para lançar um Orbe de Vínculo. Você tem orbes na bolsa — tente capturar o esporo!',
    showSkip: true,
    showContinue: false,
    skipLabel: 'Seguir sozinho',
    highlight: 'capture_q',
  },
  dungeon_exit: {
    text: 'Ótimo! O portal de retorno apareceu. Vá até ele e pressione [E] para voltar à base com a criatura.',
    showSkip: true,
    showContinue: true,
    skipLabel: 'Seguir sozinho',
    highlight: null,
  },
  return_home: {
    text: 'Primeira expedição concluída. A criatura está na bolsa — depois você pode colocá-la no habitat ou vendê-la na loja. Por hoje, isso basta.',
    showSkip: false,
    showContinue: true,
    skipLabel: '',
    highlight: null,
  },
  done: {
    text: '',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: null,
  },
  build_habitat: {
    text: '',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: null,
  },
  place_creature: {
    text: '',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: null,
  },
  shop_stock: {
    text: '',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: null,
  },
  shop_sell: {
    text: '',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: null,
  },
  buy_orbes: {
    text: '',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: null,
  },
};

export function isTutorialActive(state: GameState): boolean {
  return !state.tutorialComplete && state.tutorialStep !== 'done';
}

export function shouldUseTutorialDungeon(state: GameState): boolean {
  if (!isTutorialActive(state)) return false;
  return state.tutorialStep === 'go_portal' || DUNGEON_STEPS.includes(state.tutorialStep);
}

export function canEnterDungeonDuringTutorial(state: GameState): boolean {
  if (!isTutorialActive(state)) return true;
  return state.tutorialStep === 'go_portal' || DUNGEON_STEPS.includes(state.tutorialStep);
}

export function canUseBaseLandmark(
  state: GameState,
  landmark: 'portal' | 'shop',
): boolean {
  if (!isTutorialActive(state)) return true;
  if (landmark === 'shop') return state.tutorialStep !== 'go_portal' && state.tutorialStep !== 'welcome';
  if (landmark === 'portal') return state.tutorialStep === 'go_portal';
  return true;
}

export function shouldBlockBaseActions(state: GameState): boolean {
  if (!isTutorialActive(state)) return false;
  return state.tutorialStep === 'welcome' || state.tutorialStep === 'return_home';
}

/** Bloqueia WASD/combate só enquanto o jogador deve ler e clicar em Continuar na base. */
export function shouldBlockTutorialGameplay(state: GameState): boolean {
  return shouldBlockBaseActions(state);
}

export function getTutorialDialog(state: GameState): TutorialDialogContent | null {
  if (!isTutorialActive(state)) return null;
  const copy = STEP_COPY[state.tutorialStep];
  if (!copy.text) return null;
  return { step: state.tutorialStep, ...copy };
}

export function shouldShowTutorialDialog(state: GameState): boolean {
  const dialog = getTutorialDialog(state);
  if (!dialog) return false;
  if (state.tutorialStep === 'go_portal') return true;
  if (state.tutorialStep === 'dungeon_capture' && !dialog.showContinue) return true;
  return dialog.showContinue;
}

export function completeTutorial(state: GameState): void {
  state.tutorialComplete = true;
  state.tutorialStep = 'done';
}

export interface TutorialAdvanceResult {
  advanced: boolean;
  completed: boolean;
  previousStep: TutorialStepId;
  nextStep: TutorialStepId;
}

export function advanceTutorial(state: GameState, event: TutorialEvent): TutorialAdvanceResult {
  const previousStep = state.tutorialStep;
  if (!isTutorialActive(state) && event !== 'skip') {
    return { advanced: false, completed: state.tutorialComplete, previousStep, nextStep: state.tutorialStep };
  }

  if (event === 'skip') {
    completeTutorial(state);
    return { advanced: true, completed: true, previousStep, nextStep: 'done' };
  }

  let next = state.tutorialStep;
  switch (event) {
    case 'dialog_next':
      if (state.tutorialStep === 'welcome') next = 'go_portal';
      else if (state.tutorialStep === 'dungeon_move') next = 'dungeon_attack';
      else if (state.tutorialStep === 'return_home') {
        completeTutorial(state);
        next = 'done';
      }
      break;
    case 'portal_opened':
      if (state.tutorialStep === 'welcome' || state.tutorialStep === 'go_portal') {
        next = 'go_portal';
      }
      break;
    case 'dungeon_entered':
      if (state.tutorialStep === 'go_portal') next = 'dungeon_move';
      break;
    case 'enemy_damaged':
      if (
        state.tutorialStep === 'dungeon_move' ||
        state.tutorialStep === 'dungeon_attack' ||
        state.tutorialStep === 'dungeon_capture'
      ) {
        next = 'dungeon_capture';
      }
      break;
    case 'capture_attempted':
      if (state.tutorialStep === 'dungeon_capture') next = 'dungeon_capture';
      break;
    case 'capture_success':
    case 'enemy_defeated':
      if (DUNGEON_STEPS.includes(state.tutorialStep)) next = 'dungeon_exit';
      break;
    case 'returned_to_base':
      if (state.tutorialStep === 'dungeon_exit') next = 'return_home';
      break;
    default:
      break;
  }

  const advanced = next !== previousStep;
  state.tutorialStep = next;
  return {
    advanced,
    completed: state.tutorialComplete,
    previousStep,
    nextStep: next,
  };
}
