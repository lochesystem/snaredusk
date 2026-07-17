import { clientToGameScreen } from './pointer.ts';

export class InputManager {
  private keys = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  mouseDown = false;
  private clickQueued = false;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    const updatePointer = (clientX: number, clientY: number) => {
      const pos = clientToGameScreen(canvas, clientX, clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
    };

    canvas.addEventListener('pointermove', (e) => {
      updatePointer(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointerdown', (e) => {
      updatePointer(e.clientX, e.clientY);
      if (e.button === 0) {
        this.mouseDown = true;
        this.clickQueued = true;
      }
    });

    window.addEventListener('pointerup', () => {
      this.mouseDown = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  consumeClick(): boolean {
    if (!this.clickQueued) return false;
    this.clickQueued = false;
    return true;
  }

  consumeKey(key: string): boolean {
    if (!this.isDown(key)) return false;
    this.keys.delete(key.toLowerCase());
    return true;
  }

  getMovement(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) y += 1;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y) || 1;
      return { x: x / len, y: y / len };
    }
    return { x: 0, y: 0 };
  }
}
