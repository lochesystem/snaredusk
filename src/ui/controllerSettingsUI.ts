import {
  CONTROLLER_ACTIONS,
  CONTROLLER_ACTION_LABELS,
  bindControllerButton,
  controllerButtonLabel,
  getControllerSettings,
  resetControllerSettings,
  saveControllerSettings,
  type ControllerAction,
} from '../systems/controllerSettings.ts';

let captureAction: ControllerAction | null = null;
let captureFrame = 0;

function connectedGamepad(): Gamepad | null {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return null;
  }
  return Array.from(navigator.getGamepads())
    .find((gamepad): gamepad is Gamepad => Boolean(gamepad?.connected)) ?? null;
}

function shortGamepadName(gamepad: Gamepad): string {
  const id = gamepad.id.trim();
  if (/dualsense|wireless controller/i.test(id)) return 'DualSense conectado';
  return id.length > 42 ? `${id.slice(0, 39)}…` : `${id} conectado`;
}

function renderStatus(): void {
  const status = document.getElementById('controller-status');
  if (!status) return;
  const gamepad = connectedGamepad();
  status.textContent = gamepad ? shortGamepadName(gamepad) : 'Pressione um botão para conectar';
  status.classList.toggle('connected', Boolean(gamepad));
}

function renderBindings(): void {
  const container = document.getElementById('controller-bindings');
  if (!container) return;
  const settings = getControllerSettings();
  container.replaceChildren();
  for (const action of CONTROLLER_ACTIONS) {
    const row = document.createElement('div');
    row.className = 'controller-binding-row';
    const label = document.createElement('span');
    label.textContent = CONTROLLER_ACTION_LABELS[action];
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.controllerAction = action;
    button.textContent = captureAction === action
      ? 'Pressione…'
      : controllerButtonLabel(settings.bindings[action]);
    button.classList.toggle('listening', captureAction === action);
    row.append(label, button);
    container.appendChild(row);
  }
}

export function renderControllerSettings(): void {
  const settings = getControllerSettings();
  const enabled = document.getElementById('controller-enabled') as HTMLInputElement | null;
  const deadzone = document.getElementById('controller-deadzone') as HTMLInputElement | null;
  const cursorSpeed = document.getElementById('controller-cursor-speed') as HTMLInputElement | null;
  const invertY = document.getElementById('controller-invert-y') as HTMLInputElement | null;
  const vibration = document.getElementById('controller-vibration') as HTMLInputElement | null;
  if (enabled) enabled.checked = settings.enabled;
  if (deadzone) deadzone.value = String(Math.round(settings.deadzone * 100));
  if (cursorSpeed) cursorSpeed.value = String(Math.round(settings.cursorSpeed * 100));
  if (invertY) invertY.checked = settings.invertAimY;
  if (vibration) vibration.value = String(Math.round(settings.vibration * 100));
  const deadzoneValue = document.getElementById('controller-deadzone-value');
  const cursorValue = document.getElementById('controller-cursor-speed-value');
  const vibrationValue = document.getElementById('controller-vibration-value');
  if (deadzoneValue) deadzoneValue.textContent = `${Math.round(settings.deadzone * 100)}%`;
  if (cursorValue) cursorValue.textContent = `${Math.round(settings.cursorSpeed * 100)}%`;
  if (vibrationValue) vibrationValue.textContent = `${Math.round(settings.vibration * 100)}%`;
  renderStatus();
  renderBindings();
}

function saveForm(): void {
  const current = getControllerSettings();
  const enabled = document.getElementById('controller-enabled') as HTMLInputElement | null;
  const deadzone = document.getElementById('controller-deadzone') as HTMLInputElement | null;
  const cursorSpeed = document.getElementById('controller-cursor-speed') as HTMLInputElement | null;
  const invertY = document.getElementById('controller-invert-y') as HTMLInputElement | null;
  const vibration = document.getElementById('controller-vibration') as HTMLInputElement | null;
  saveControllerSettings({
    ...current,
    enabled: enabled?.checked ?? current.enabled,
    deadzone: Number(deadzone?.value ?? 18) / 100,
    cursorSpeed: Number(cursorSpeed?.value ?? 100) / 100,
    invertAimY: invertY?.checked ?? current.invertAimY,
    vibration: Number(vibration?.value ?? 55) / 100,
  });
  renderControllerSettings();
}

function stopCapture(): void {
  captureAction = null;
  if (captureFrame) cancelAnimationFrame(captureFrame);
  captureFrame = 0;
  renderBindings();
}

function beginCapture(action: ControllerAction): void {
  stopCapture();
  captureAction = action;
  renderBindings();
  let released = false;

  const poll = () => {
    if (!captureAction) return;
    const gamepad = connectedGamepad();
    const pressedIndex = gamepad?.buttons.findIndex(
      (button) => button.pressed || button.value >= 0.6,
    ) ?? -1;
    if (!released) {
      released = pressedIndex < 0;
    } else if (pressedIndex >= 0) {
      bindControllerButton(captureAction, pressedIndex);
      captureAction = null;
      captureFrame = 0;
      renderControllerSettings();
      return;
    }
    captureFrame = requestAnimationFrame(poll);
  };
  captureFrame = requestAnimationFrame(poll);
}

function testVibration(): void {
  const gamepad = connectedGamepad() as (Gamepad & {
    vibrationActuator?: {
      playEffect?: (
        type: string,
        options: Record<string, number>,
      ) => Promise<unknown>;
    };
  }) | null;
  const settings = getControllerSettings();
  const actuator = gamepad?.vibrationActuator;
  if (!actuator?.playEffect || settings.vibration <= 0) return;
  void actuator.playEffect('dual-rumble', {
    duration: 180,
    startDelay: 0,
    strongMagnitude: settings.vibration,
    weakMagnitude: settings.vibration * 0.7,
  }).catch(() => undefined);
}

export function bindControllerSettingsModal(): void {
  document.getElementById('controller-enabled')?.addEventListener('change', saveForm);
  document.getElementById('controller-deadzone')?.addEventListener('input', saveForm);
  document.getElementById('controller-cursor-speed')?.addEventListener('input', saveForm);
  document.getElementById('controller-invert-y')?.addEventListener('change', saveForm);
  document.getElementById('controller-vibration')?.addEventListener('input', saveForm);
  document.getElementById('controller-bindings')?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLButtonElement>('[data-controller-action]')
      ?.dataset.controllerAction as ControllerAction | undefined;
    if (action && CONTROLLER_ACTIONS.includes(action)) beginCapture(action);
  });
  document.getElementById('controller-reset')?.addEventListener('click', () => {
    stopCapture();
    resetControllerSettings();
    renderControllerSettings();
  });
  document.getElementById('controller-test-vibration')?.addEventListener('click', testVibration);
  window.addEventListener('gamepadconnected', renderStatus);
  window.addEventListener('gamepaddisconnected', renderStatus);
  window.addEventListener('snaredusk:gamepad-status', renderStatus);
}

export function closeControllerBindingCapture(): void {
  stopCapture();
}
