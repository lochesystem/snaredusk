import { beforeEach, describe, expect, it } from 'vitest';
import { applyGamepadDeadzone, InputManager } from '../src/engine/input.ts';
import {
  bindControllerButton,
  controllerButtonLabel,
  getControllerSettings,
  normalizeControllerSettings,
  resetControllerSettingsForTests,
} from '../src/systems/controllerSettings.ts';

describe('controllerSettings', () => {
  beforeEach(() => {
    resetControllerSettingsForTests();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => undefined,
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { dispatchEvent: () => true },
    });
  });

  it('normaliza limites e preserva o mapeamento padrão', () => {
    const settings = normalizeControllerSettings({
      deadzone: -2,
      cursorSpeed: 9,
      vibration: 4,
      bindings: { attack: 31 } as never,
    });
    expect(settings.deadzone).toBe(0.05);
    expect(settings.cursorSpeed).toBe(2);
    expect(settings.vibration).toBe(1);
    expect(settings.bindings.attack).toBe(31);
    expect(settings.bindings.interact).toBe(0);
  });

  it('troca bindings conflitantes em vez de duplicar botões', () => {
    const before = getControllerSettings();
    const next = bindControllerButton('attack', before.bindings.interact);
    expect(next.bindings.attack).toBe(0);
    expect(next.bindings.interact).toBe(7);
  });

  it('usa nomes de botões do layout PlayStation', () => {
    expect(controllerButtonLabel(0)).toBe('✕');
    expect(controllerButtonLabel(7)).toBe('R2');
    expect(controllerButtonLabel(29)).toBe('Botão 29');
  });

  it('remove drift do analógico e mantém direção fora da zona morta', () => {
    expect(applyGamepadDeadzone(0.08, -0.06, 0.18)).toEqual({ x: 0, y: 0 });
    const movement = applyGamepadDeadzone(0.8, 0.2, 0.18);
    expect(movement.x).toBeGreaterThan(0.7);
    expect(movement.y).toBeGreaterThan(0);
  });

  it('lê movimento e ataque do gamepad padrão sem repetir o clique', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        addEventListener: () => undefined,
        dispatchEvent: () => true,
      },
    });
    const buttons = Array.from({ length: 18 }, () => ({ pressed: false, value: 0 }));
    buttons[7] = { pressed: true, value: 1 };
    const gamepad = {
      connected: true,
      id: 'DualSense Wireless Controller',
      index: 0,
      axes: [0.75, 0, 0.5, 0],
      buttons,
    };
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { getGamepads: () => [gamepad] },
    });
    const canvas = {
      addEventListener: () => undefined,
    } as unknown as HTMLCanvasElement;
    const input = new InputManager(canvas);

    input.updateGamepads(1 / 60);
    expect(input.getMovement().x).toBeGreaterThan(0.6);
    expect(input.consumeNavigation()).toBeNull();
    expect(input.consumeClick()).toBe(true);
    expect(input.consumeClick()).toBe(false);

    buttons[7] = { pressed: false, value: 0 };
    buttons[15] = { pressed: true, value: 1 };
    input.updateGamepads(1 / 60);
    expect(input.consumeNavigation()).toBe('right');
    expect(input.consumeClick()).toBe(false);
  });
});
