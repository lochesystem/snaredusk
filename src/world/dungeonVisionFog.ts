import { Container, Sprite, Texture } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/constants.ts';

export const VISION_CLEAR_RADIUS = 70;
export const VISION_FADE_RADIUS = 174;

const TEXTURE_WIDTH = GAME_WIDTH * 2;
const TEXTURE_HEIGHT = GAME_HEIGHT * 2;
const TEXTURE_CENTER_X = TEXTURE_WIDTH / 2;
const TEXTURE_CENTER_Y = TEXTURE_HEIGHT / 2;

export function visionFogPosition(screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: screenX - TEXTURE_CENTER_X,
    y: screenY - TEXTURE_CENTER_Y,
  };
}

export function visionFogCoversViewport(screenX: number, screenY: number): boolean {
  const position = visionFogPosition(screenX, screenY);
  return position.x <= 0
    && position.y <= 0
    && position.x + TEXTURE_WIDTH >= GAME_WIDTH
    && position.y + TEXTURE_HEIGHT >= GAME_HEIGHT;
}

function eraseSoftLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  clearRadius: number,
  fadeRadius: number,
  strength = 1,
): void {
  const gradient = ctx.createRadialGradient(x, y, clearRadius, x, y, fadeRadius);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
  gradient.addColorStop(0.42, `rgba(0, 0, 0, ${strength * 0.92})`);
  gradient.addColorStop(0.72, `rgba(0, 0, 0, ${strength * 0.42})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - fadeRadius, y - fadeRadius, fadeRadius * 2, fadeRadius * 2);
}

function createFogCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = 'rgba(3, 4, 7, 0.97)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-out';

  eraseSoftLight(
    ctx,
    TEXTURE_CENTER_X,
    TEXTURE_CENTER_Y,
    VISION_CLEAR_RADIUS,
    VISION_FADE_RADIUS,
  );

  // Pequenas lobas quebram a silhueta circular sem formar manchas separadas.
  const lobes = [
    { angle: 0.18, distance: 76, radius: 72, strength: 0.2 },
    { angle: 1.08, distance: 82, radius: 64, strength: 0.16 },
    { angle: 2.02, distance: 73, radius: 70, strength: 0.18 },
    { angle: 2.94, distance: 80, radius: 62, strength: 0.15 },
    { angle: 3.92, distance: 75, radius: 68, strength: 0.18 },
    { angle: 5.08, distance: 81, radius: 66, strength: 0.17 },
  ];
  for (const lobe of lobes) {
    const x = TEXTURE_CENTER_X + Math.cos(lobe.angle) * lobe.distance;
    const y = TEXTURE_CENTER_Y + Math.sin(lobe.angle) * lobe.distance * 0.72;
    eraseSoftLight(ctx, x, y, 0, lobe.radius, lobe.strength);
  }

  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

export class DungeonVisionFog {
  readonly root = new Container();
  private readonly sprite: Sprite;

  constructor() {
    const texture = Texture.from(createFogCanvas());
    this.sprite = new Sprite(texture);
    this.root.eventMode = 'none';
    this.root.addChild(this.sprite);
    this.update(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }

  update(playerScreenX: number, playerScreenY: number): void {
    const position = visionFogPosition(playerScreenX, playerScreenY);
    this.sprite.x = Math.round(position.x);
    this.sprite.y = Math.round(position.y);
  }
}
