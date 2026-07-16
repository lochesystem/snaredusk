import { GAME_HEIGHT, GAME_WIDTH } from './constants.ts';

export class Camera {
  x = 0;
  y = 0;
  private targetX = 0;
  private targetY = 0;
  private smoothing = 0.12;
  readonly viewWidth = GAME_WIDTH;
  readonly viewHeight = GAME_HEIGHT;

  follow(worldX: number, worldY: number, worldWidth: number, worldHeight: number): void {
    if (worldWidth <= this.viewWidth) {
      this.targetX = (worldWidth - this.viewWidth) / 2;
    } else {
      this.targetX = worldX - this.viewWidth / 2;
      this.targetX = Math.max(0, Math.min(worldWidth - this.viewWidth, this.targetX));
    }

    if (worldHeight <= this.viewHeight) {
      this.targetY = (worldHeight - this.viewHeight) / 2;
    } else {
      this.targetY = worldY - this.viewHeight / 2;
      this.targetY = Math.max(0, Math.min(worldHeight - this.viewHeight, this.targetY));
    }
  }

  update(): void {
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: wx - this.x, y: wy - this.y };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: sx + this.x, y: sy + this.y };
  }
}
