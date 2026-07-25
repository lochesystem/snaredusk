export const CONTROLLER_SETTINGS_KEY = 'snaredusk-controller-settings';

export const CONTROLLER_ACTIONS = [
  'interact',
  'dodge',
  'capture',
  'inventory',
  'weapon1',
  'weapon2',
  'attack',
  'map',
  'menu',
  'rotate',
] as const;

export type ControllerAction = typeof CONTROLLER_ACTIONS[number];

export interface ControllerSettings {
  enabled: boolean;
  deadzone: number;
  cursorSpeed: number;
  invertAimY: boolean;
  vibration: number;
  bindings: Record<ControllerAction, number>;
}

export const CONTROLLER_ACTION_LABELS: Record<ControllerAction, string> = {
  interact: 'Interagir / confirmar',
  dodge: 'Esquiva',
  capture: 'Lançar Orbe',
  inventory: 'Inventário',
  weapon1: 'Arma 1',
  weapon2: 'Arma 2',
  attack: 'Atacar',
  map: 'Mostrar mapa',
  menu: 'Menu / cancelar',
  rotate: 'Rotacionar construção',
};

export const STANDARD_GAMEPAD_BUTTON_LABELS: Record<number, string> = {
  0: '✕',
  1: '○',
  2: '□',
  3: '△',
  4: 'L1',
  5: 'R1',
  6: 'L2',
  7: 'R2',
  8: 'Criar',
  9: 'Options',
  10: 'L3',
  11: 'R3',
  12: '↑',
  13: '↓',
  14: '←',
  15: '→',
  16: 'PS',
  17: 'Touchpad',
};

const DEFAULT_BINDINGS: Record<ControllerAction, number> = {
  interact: 0,
  dodge: 1,
  capture: 2,
  inventory: 3,
  weapon1: 4,
  weapon2: 5,
  attack: 7,
  map: 8,
  menu: 9,
  rotate: 6,
};

export const DEFAULT_CONTROLLER_SETTINGS: ControllerSettings = {
  enabled: true,
  deadzone: 0.18,
  cursorSpeed: 1,
  invertAimY: false,
  vibration: 0.55,
  bindings: { ...DEFAULT_BINDINGS },
};

let current: ControllerSettings = {
  ...DEFAULT_CONTROLLER_SETTINGS,
  bindings: { ...DEFAULT_BINDINGS },
};

function finiteRange(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

export function normalizeControllerSettings(
  raw: Partial<ControllerSettings> | null | undefined,
): ControllerSettings {
  const rawBindings = raw?.bindings && typeof raw.bindings === 'object'
    ? raw.bindings
    : {};
  const bindings = { ...DEFAULT_BINDINGS };
  for (const action of CONTROLLER_ACTIONS) {
    const button = (rawBindings as Partial<Record<ControllerAction, unknown>>)[action];
    if (typeof button === 'number' && Number.isInteger(button) && button >= 0 && button <= 31) {
      bindings[action] = button;
    }
  }
  return {
    enabled: typeof raw?.enabled === 'boolean'
      ? raw.enabled
      : DEFAULT_CONTROLLER_SETTINGS.enabled,
    deadzone: finiteRange(
      raw?.deadzone,
      DEFAULT_CONTROLLER_SETTINGS.deadzone,
      0.05,
      0.5,
    ),
    cursorSpeed: finiteRange(
      raw?.cursorSpeed,
      DEFAULT_CONTROLLER_SETTINGS.cursorSpeed,
      0.4,
      2,
    ),
    invertAimY: typeof raw?.invertAimY === 'boolean'
      ? raw.invertAimY
      : DEFAULT_CONTROLLER_SETTINGS.invertAimY,
    vibration: finiteRange(
      raw?.vibration,
      DEFAULT_CONTROLLER_SETTINGS.vibration,
      0,
      1,
    ),
    bindings,
  };
}

export function loadControllerSettings(): ControllerSettings {
  try {
    const raw = localStorage.getItem(CONTROLLER_SETTINGS_KEY);
    current = raw
      ? normalizeControllerSettings(JSON.parse(raw) as Partial<ControllerSettings>)
      : normalizeControllerSettings(null);
  } catch {
    current = normalizeControllerSettings(null);
  }
  return getControllerSettings();
}

export function getControllerSettings(): ControllerSettings {
  return {
    ...current,
    bindings: { ...current.bindings },
  };
}

export function saveControllerSettings(next: ControllerSettings): ControllerSettings {
  current = normalizeControllerSettings(next);
  try {
    localStorage.setItem(CONTROLLER_SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // Preferências continuam válidas na sessão mesmo sem storage disponível.
  }
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent('snaredusk:controller-settings'));
  }
  return getControllerSettings();
}

export function bindControllerButton(
  action: ControllerAction,
  button: number,
): ControllerSettings {
  const next = getControllerSettings();
  const previousButton = next.bindings[action];
  const conflictingAction = CONTROLLER_ACTIONS.find(
    (candidate) => candidate !== action && next.bindings[candidate] === button,
  );
  if (conflictingAction) next.bindings[conflictingAction] = previousButton;
  next.bindings[action] = button;
  return saveControllerSettings(next);
}

export function resetControllerSettings(): ControllerSettings {
  return saveControllerSettings({
    ...DEFAULT_CONTROLLER_SETTINGS,
    bindings: { ...DEFAULT_BINDINGS },
  });
}

export function controllerButtonLabel(button: number): string {
  return STANDARD_GAMEPAD_BUTTON_LABELS[button] ?? `Botão ${button}`;
}

export function resetControllerSettingsForTests(): void {
  current = {
    ...DEFAULT_CONTROLLER_SETTINGS,
    bindings: { ...DEFAULT_BINDINGS },
  };
}
