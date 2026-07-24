import type { GameState, TutorialStepId, CreatureItem } from '../types.ts';
import type { StationId } from '../data/baseStations.ts';
import { getSpecies } from '../data/creatures.ts';
import { moveCreatureToBag } from './habitat.ts';
import { addToBag } from './saveManager.ts';

type BuildTool = StationId | 'move';

export const TUTORIAL_CREATURE_SPECIES = 'esporo_dorminhoco';

export type TutorialEvent =
  | 'dialog_next'
  | 'portal_opened'
  | 'dungeon_entered'
  | 'enemy_damaged'
  | 'capture_attempted'
  | 'capture_success'
  | 'enemy_defeated'
  | 'returned_to_base'
  | 'habitat_pen_placed'
  | 'creature_placed'
  | 'shop_item_stocked'
  | 'shop_day_finished'
  | 'orbes_purchased'
  | 'skip';

export type TutorialHighlight = 'portal' | 'capture_q' | 'build_pen' | 'bag' | 'shop' | 'shop_open' | 'orbes' | null;

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

const BASE_ACTION_STEPS: TutorialStepId[] = [
  'build_habitat',
  'place_creature',
  'shop_stock',
  'shop_sell',
  'buy_orbes',
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
    text: 'Primeira expedição concluída! A criatura está na bolsa. Deixei um kit de Cercado no slot [3] — selecione e arraste uma área no chão. Depois, os móveis precisam ser fabricados na bancada.',
    showSkip: false,
    showContinue: true,
    skipLabel: '',
    highlight: null,
  },
  build_habitat: {
    text: 'Arraste no chão para definir o cercado. A colocação consome o kit do slot; para construir outro, junte materiais e fabrique na bancada.',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: 'build_pen',
  },
  place_creature: {
    text: 'Pressione [I] para abrir a bolsa ou [E] no cercado para colocar a criatura capturada.',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: 'bag',
  },
  shop_stock: {
    text: 'Hora de vender! Vá até a loja na base e pressione [E]. Coloque a criatura numa gaiola e confirme o preço.',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: 'shop',
  },
  shop_sell: {
    text: 'Clientes mostram emojis no balcão — 😊 compram fácil, 😐 hesitam, 😠 desistem. Pressione «Abrir loja ao público» quando estiver pronto.',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: 'shop_open',
  },
  buy_orbes: {
    text: 'Volte à base, abra Orbes no canto superior e compre mais Orbes de Vínculo para a próxima expedição.',
    showSkip: false,
    showContinue: false,
    skipLabel: '',
    highlight: 'orbes',
  },
  done: {
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

export function hasAnyCreature(state: GameState): boolean {
  if (state.bag.some((entry) => entry?.kind === 'creature')) return true;
  return state.habitat.length > 0;
}

/** Garante o esporo do tutorial na bolsa se o jogador matou em vez de capturar. */
export function grantTutorialCreatureIfNeeded(state: GameState): boolean {
  if (!isTutorialActive(state)) return false;
  if (hasAnyCreature(state)) return false;

  const species = getSpecies(TUTORIAL_CREATURE_SPECIES);
  const creature: CreatureItem = {
    kind: 'creature',
    speciesId: species.id,
    name: species.name,
    baseValue: species.baseValue,
  };
  return addToBag(state, creature);
}

/** Recoloca criatura do habitat na bolsa para expor na loja (passo shop_stock). */
export function ensureTutorialCreatureInBagForShop(state: GameState): boolean {
  if (!isTutorialActive(state) || state.tutorialStep !== 'shop_stock') return false;
  if (state.bag.some((entry) => entry?.kind === 'creature')) return false;
  if (state.habitat.length > 0) {
    return moveCreatureToBag(state, 0) !== null;
  }
  return grantTutorialCreatureIfNeeded(state);
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
  if (landmark === 'shop') {
    return state.tutorialStep === 'shop_stock' || state.tutorialStep === 'shop_sell';
  }
  if (landmark === 'portal') return state.tutorialStep === 'go_portal';
  return true;
}

export function canOpenShopDuringTutorial(state: GameState): boolean {
  if (!isTutorialActive(state)) return true;
  return state.tutorialStep === 'shop_stock' || state.tutorialStep === 'shop_sell';
}

export function canStartShopDayDuringTutorial(state: GameState): boolean {
  if (!isTutorialActive(state)) return true;
  return state.tutorialStep === 'shop_sell';
}

export function canUseBuildTool(state: GameState, tool: BuildTool | null): boolean {
  if (!isTutorialActive(state)) return true;
  if (tool === null) return true;
  if (state.tutorialStep === 'build_habitat') return tool === 'habitat_pen';
  return false;
}

export function canOpenBaseBagDuringTutorial(state: GameState): boolean {
  if (!isTutorialActive(state)) return true;
  return state.tutorialStep === 'place_creature';
}

export function canOpenOrbsDuringTutorial(state: GameState): boolean {
  if (!isTutorialActive(state)) return true;
  return state.tutorialStep === 'buy_orbes';
}

export function canSleepDuringTutorial(state: GameState): boolean {
  return !isTutorialActive(state);
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
  if (BASE_ACTION_STEPS.includes(state.tutorialStep)) return true;
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
      else if (state.tutorialStep === 'return_home') next = 'build_habitat';
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
    case 'habitat_pen_placed':
      if (state.tutorialStep === 'build_habitat') next = 'place_creature';
      break;
    case 'creature_placed':
      if (state.tutorialStep === 'place_creature') next = 'shop_stock';
      break;
    case 'shop_item_stocked':
      if (state.tutorialStep === 'shop_stock') next = 'shop_sell';
      break;
    case 'shop_day_finished':
      if (state.tutorialStep === 'shop_sell') next = 'buy_orbes';
      break;
    case 'orbes_purchased':
      if (state.tutorialStep === 'buy_orbes') {
        completeTutorial(state);
        next = 'done';
      }
      break;
    default:
      break;
  }

  const advanced = next !== previousStep;
  state.tutorialStep = next;
  if (next === 'return_home' || next === 'place_creature' || next === 'shop_stock') {
    grantTutorialCreatureIfNeeded(state);
  }
  return {
    advanced,
    completed: state.tutorialComplete,
    previousStep,
    nextStep: state.tutorialStep,
  };
}
