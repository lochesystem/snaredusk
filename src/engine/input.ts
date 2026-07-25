import {
  CONTROLLER_ACTIONS,
  getControllerSettings,
  type ControllerAction,
} from '../systems/controllerSettings.ts';
import { GAME_HEIGHT, GAME_WIDTH } from './constants.ts';
import { clientToGameScreen } from './pointer.ts';

const KEY_ACTIONS: Partial<Record<string, ControllerAction>> = {
  e: 'interact',
  shift: 'dodge',
  q: 'capture',
  i: 'inventory',
  '1': 'weapon1',
  '2': 'weapon2',
  m: 'map',
  escape: 'menu',
  r: 'rotate',
};

export function applyGamepadDeadzone(
  x: number,
  y: number,
  deadzone: number,
): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (length <= deadzone) return { x: 0, y: 0 };
  const normalized = Math.min(1, (length - deadzone) / (1 - deadzone));
  return {
    x: (x / length) * normalized,
    y: (y / length) * normalized,
  };
}

function availableGamepads(): (Gamepad | null)[] {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return [];
  }
  return Array.from(navigator.getGamepads());
}

export class InputManager {
  private keys = new Set<string>();
  private pointerDown = false;
  private clickQueued = false;
  private gamepadIndex: number | null = null;
  private gamepadName = '';
  private controllerDown = new Set<ControllerAction>();
  private controllerPressed = new Set<ControllerAction>();
  private controllerMovement = { x: 0, y: 0 };
  private controllerAim = { x: 0, y: 0 };
  private usingGamepad = false;
  private controllerUiCaptured = false;
  private navigationDown = new Set<'up' | 'down' | 'left' | 'right'>();
  private navigationPressed = new Set<'up' | 'down' | 'left' | 'right'>();

  mouseX = GAME_WIDTH / 2;
  mouseY = GAME_HEIGHT / 2;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.usingGamepad = false;
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    const updatePointer = (clientX: number, clientY: number) => {
      const pos = clientToGameScreen(canvas, clientX, clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.usingGamepad = false;
    };

    canvas.addEventListener('pointermove', (e) => {
      updatePointer(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointerdown', (e) => {
      updatePointer(e.clientX, e.clientY);
      if (e.button === 0) {
        this.pointerDown = true;
        this.clickQueued = true;
      }
    });

    window.addEventListener('pointerup', () => {
      this.pointerDown = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Atualiza o snapshot do Gamepad API uma vez por frame. */
  updateGamepads(dt: number): void {
    const settings = getControllerSettings();
    if (!settings.enabled) {
      this.clearGamepadState();
      return;
    }

    const pads = availableGamepads();
    let gamepad = this.gamepadIndex === null ? null : pads[this.gamepadIndex] ?? null;
    if (!gamepad?.connected) {
      gamepad = pads.find((candidate): candidate is Gamepad => Boolean(candidate?.connected)) ?? null;
    }

    const previousIndex = this.gamepadIndex;
    this.gamepadIndex = gamepad?.index ?? null;
    this.gamepadName = gamepad?.id ?? '';
    if (!gamepad) {
      this.clearGamepadState(false);
      if (previousIndex !== null) this.dispatchGamepadStatus();
      return;
    }
    if (previousIndex !== this.gamepadIndex) this.dispatchGamepadStatus();

    const nextDown = new Set<ControllerAction>();
    for (const action of CONTROLLER_ACTIONS) {
      const button = gamepad.buttons[settings.bindings[action]];
      if (button?.pressed || (button?.value ?? 0) >= 0.45) nextDown.add(action);
    }
    for (const action of nextDown) {
      if (!this.controllerDown.has(action)) this.controllerPressed.add(action);
    }
    for (const action of this.controllerPressed) {
      if (!nextDown.has(action)) this.controllerPressed.delete(action);
    }
    this.controllerDown = nextDown;

    this.controllerMovement = applyGamepadDeadzone(
      gamepad.axes[0] ?? 0,
      gamepad.axes[1] ?? 0,
      settings.deadzone,
    );
    const aim = applyGamepadDeadzone(
      gamepad.axes[2] ?? 0,
      gamepad.axes[3] ?? 0,
      settings.deadzone,
    );
    this.controllerAim = {
      x: aim.x,
      y: settings.invertAimY ? -aim.y : aim.y,
    };

    const nextNavigation = new Set<'up' | 'down' | 'left' | 'right'>();
    if (gamepad.buttons[12]?.pressed || this.controllerMovement.y < -0.7) {
      nextNavigation.add('up');
    }
    if (gamepad.buttons[13]?.pressed || this.controllerMovement.y > 0.7) {
      nextNavigation.add('down');
    }
    if (gamepad.buttons[14]?.pressed || this.controllerMovement.x < -0.7) {
      nextNavigation.add('left');
    }
    if (gamepad.buttons[15]?.pressed || this.controllerMovement.x > 0.7) {
      nextNavigation.add('right');
    }
    for (const direction of nextNavigation) {
      if (!this.navigationDown.has(direction)) this.navigationPressed.add(direction);
    }
    for (const direction of this.navigationPressed) {
      if (!nextNavigation.has(direction)) this.navigationPressed.delete(direction);
    }
    this.navigationDown = nextNavigation;

    const active = nextDown.size > 0
      || Math.hypot(this.controllerMovement.x, this.controllerMovement.y) > 0
      || Math.hypot(this.controllerAim.x, this.controllerAim.y) > 0;
    if (active) this.usingGamepad = true;

    if (Math.hypot(this.controllerAim.x, this.controllerAim.y) > 0) {
      const cursorPixelsPerSecond = 190 * settings.cursorSpeed;
      this.mouseX = Math.min(
        GAME_WIDTH,
        Math.max(0, this.mouseX + this.controllerAim.x * cursorPixelsPerSecond * dt),
      );
      this.mouseY = Math.min(
        GAME_HEIGHT,
        Math.max(0, this.mouseY + this.controllerAim.y * cursorPixelsPerSecond * dt),
      );
    }
  }

  private clearGamepadState(clearIdentity = true): void {
    if (clearIdentity) {
      this.gamepadIndex = null;
      this.gamepadName = '';
    }
    this.controllerDown.clear();
    this.controllerPressed.clear();
    this.controllerMovement = { x: 0, y: 0 };
    this.controllerAim = { x: 0, y: 0 };
    this.navigationDown.clear();
    this.navigationPressed.clear();
  }

  private dispatchGamepadStatus(): void {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
    window.dispatchEvent(new CustomEvent('snaredusk:gamepad-status', {
      detail: {
        connected: this.gamepadIndex !== null,
        name: this.gamepadName,
      },
    }));
  }

  isDown(key: string): boolean {
    const normalized = key.toLowerCase();
    if (this.keys.has(normalized)) return true;
    const action = KEY_ACTIONS[normalized];
    return action ? this.controllerDown.has(action) : false;
  }

  get mouseDown(): boolean {
    return this.pointerDown || this.controllerDown.has('attack');
  }

  consumeClick(): boolean {
    if (this.clickQueued) {
      this.clickQueued = false;
      return true;
    }
    return this.controllerUiCaptured ? false : this.consumeControllerAction('attack');
  }

  consumeKey(key: string): boolean {
    const normalized = key.toLowerCase();
    if (this.keys.has(normalized)) {
      this.keys.delete(normalized);
      return true;
    }
    const action = KEY_ACTIONS[normalized];
    return action && !this.controllerUiCaptured
      ? this.consumeControllerAction(action)
      : false;
  }

  consumeControllerAction(action: ControllerAction): boolean {
    if (!this.controllerPressed.has(action)) return false;
    this.controllerPressed.delete(action);
    return true;
  }

  getMovement(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y) || 1;
      return { x: x / len, y: y / len };
    }
    return this.controllerUiCaptured ? { x: 0, y: 0 } : { ...this.controllerMovement };
  }

  getAimVector(): { x: number; y: number } | null {
    return Math.hypot(this.controllerAim.x, this.controllerAim.y) > 0
      ? { ...this.controllerAim }
      : null;
  }

  isUsingGamepad(): boolean {
    return this.usingGamepad && this.gamepadIndex !== null;
  }

  setControllerUiCaptured(captured: boolean): void {
    this.controllerUiCaptured = captured;
  }

  consumeNavigation(): 'up' | 'down' | 'left' | 'right' | null {
    for (const direction of ['up', 'down', 'left', 'right'] as const) {
      if (!this.navigationPressed.has(direction)) continue;
      this.navigationPressed.delete(direction);
      return direction;
    }
    return null;
  }

  isGamepadConnected(): boolean {
    return this.gamepadIndex !== null;
  }

  getGamepadName(): string {
    return this.gamepadName;
  }

  pulseGamepad(strength = 0.4, duration = 70): void {
    const settings = getControllerSettings();
    if (!settings.enabled || settings.vibration <= 0 || this.gamepadIndex === null) return;
    const gamepad = availableGamepads()[this.gamepadIndex];
    const actuator = (gamepad as unknown as {
      vibrationActuator?: {
        playEffect?: (
          type: string,
          options: {
            duration: number;
            startDelay: number;
            strongMagnitude: number;
            weakMagnitude: number;
          },
        ) => Promise<unknown>;
      };
    } | null)?.vibrationActuator;
    const playEffect = actuator?.playEffect;
    if (!playEffect) return;
    const magnitude = Math.min(1, Math.max(0, strength * settings.vibration));
    void playEffect.call(actuator, 'dual-rumble', {
      duration,
      startDelay: 0,
      strongMagnitude: magnitude,
      weakMagnitude: magnitude * 0.65,
    }).catch(() => undefined);
  }
}
