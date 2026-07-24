import { Container, Graphics } from 'pixi.js';
import type { BiomeId } from '../data/biomes.ts';
import type { Rect } from '../types.ts';
import type { BossFightPhase } from '../systems/bossMechanics.ts';

export const BOSS_FOG_DISSIPATE_SEC = 2.8;

export type BossFogState = 'full' | 'dissipating' | 'cleared';

interface FogWisp {
  nx: number;
  ny: number;
  rx: number;
  ry: number;
  phase: number;
  drift: number;
  rotation: number;
  contour: number[];
}

interface FogPalette {
  base: number;
  wisp: number;
}

const PALETTES: Record<BiomeId, FogPalette> = {
  floresta: { base: 0x142218, wisp: 0x3d7a52 },
  cristal: { base: 0x141024, wisp: 0x6a58a8 },
  termal: { base: 0x241408, wisp: 0x9a5838 },
};

function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - (1 - clamped) ** 3;
}

export function calcFogOpacity(state: BossFogState, dissipateT: number): number {
  if (state === 'cleared') return 0;
  if (state === 'full') return 1;
  return 1 - easeOutCubic(dissipateT / BOSS_FOG_DISSIPATE_SEC);
}

function buildWisps(seed: number, count = 32): FogWisp[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const wisps: FogWisp[] = [];
  for (let i = 0; i < count; i++) {
    wisps.push({
      nx: rand(),
      ny: rand(),
      rx: 0.035 + rand() * 0.075,
      ry: 0.025 + rand() * 0.055,
      phase: rand() * Math.PI * 2,
      drift: 0.18 + rand() * 0.42,
      rotation: (rand() - 0.5) * 0.8,
      contour: Array.from({ length: 10 }, () => 0.72 + rand() * 0.42),
    });
  }
  return wisps;
}

/**
 * Desenha uma nuvem fechada com contorno suavemente irregular. Os três passes
 * funcionam como uma borda difusa sem depender de blur (que borra o pixel art).
 */
function drawOrganicWisp(
  gfx: Graphics,
  wisp: FogWisp,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  time: number,
  color: number,
  alpha: number,
): void {
  const pointCount = wisp.contour.length;
  const cosR = Math.cos(wisp.rotation);
  const sinR = Math.sin(wisp.rotation);

  for (let layer = 0; layer < 3; layer++) {
    const scale = 1.24 - layer * 0.17;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;
      const breathe = 1 + Math.sin(time * 0.48 + wisp.phase + i * 1.71) * 0.055;
      const radius = wisp.contour[i] * scale * breathe;
      const localX = Math.cos(angle) * rx * radius;
      const localY = Math.sin(angle) * ry * radius;
      points.push({
        x: cx + localX * cosR - localY * sinR,
        y: cy + localX * sinR + localY * cosR,
      });
    }

    const first = points[0];
    const last = points[points.length - 1];
    gfx.moveTo((last.x + first.x) * 0.5, (last.y + first.y) * 0.5);
    for (let i = 0; i < pointCount; i++) {
      const current = points[i];
      const next = points[(i + 1) % pointCount];
      gfx.quadraticCurveTo(
        current.x,
        current.y,
        (current.x + next.x) * 0.5,
        (current.y + next.y) * 0.5,
      );
    }
    gfx.closePath();
    gfx.fill({
      color,
      alpha: alpha * (layer === 0 ? 0.16 : layer === 1 ? 0.28 : 0.46),
    });
  }
}

export class BossArenaFog {
  readonly root = new Container();
  private gfx = new Graphics();
  private state: BossFogState = 'full';
  private dissipateT = 0;
  private roomRect: Rect | null = null;
  private biomeId: BiomeId = 'floresta';
  private wisps: FogWisp[] = [];
  private animTime = 0;

  constructor() {
    this.root.addChild(this.gfx);
    this.root.eventMode = 'none';
  }

  setup(roomRect: Rect, biomeId: BiomeId, seed: number): void {
    this.roomRect = { ...roomRect };
    this.biomeId = biomeId;
    this.wisps = buildWisps(seed);
    this.state = 'full';
    this.dissipateT = 0;
    this.animTime = 0;
    this.render();
  }

  startDissipation(): void {
    if (this.state === 'cleared') return;
    this.state = 'dissipating';
    this.dissipateT = 0;
  }

  resetToFull(): void {
    if (!this.roomRect) return;
    this.state = 'full';
    this.dissipateT = 0;
    this.render();
  }

  update(dt: number, bossFightPhase: BossFightPhase): void {
    if (!this.roomRect) return;

    if (bossFightPhase === 'done' || bossFightPhase === 'active') {
      this.state = 'cleared';
    }

    if (this.state === 'dissipating') {
      this.dissipateT += dt;
      if (this.dissipateT >= BOSS_FOG_DISSIPATE_SEC) {
        this.state = 'cleared';
      }
    }

    this.animTime += dt;
    this.render();
  }

  getState(): BossFogState {
    return this.state;
  }

  private render(): void {
    const rect = this.roomRect;
    if (!rect) return;

    const opacity = calcFogOpacity(this.state, this.dissipateT);
    this.root.visible = opacity > 0.01;
    if (!this.root.visible) {
      this.gfx.clear();
      return;
    }

    const pad = 10;
    const x = rect.x + pad;
    const y = rect.y + pad;
    const w = rect.width - pad * 2;
    const h = rect.height - pad * 2;
    const palette = PALETTES[this.biomeId];
    const dissolveBoost = this.state === 'dissipating'
      ? easeOutCubic(this.dissipateT / BOSS_FOG_DISSIPATE_SEC) * 0.35
      : 0;

    this.gfx.clear();

    this.gfx.roundRect(x, y, w, h, 6);
    this.gfx.fill({ color: palette.base, alpha: 0.68 * opacity });

    for (const wisp of this.wisps) {
      const pulse = 0.93 + Math.sin(this.animTime * 0.55 + wisp.phase) * 0.07;
      const driftY = Math.sin(this.animTime * wisp.drift + wisp.phase) * 11 * (1 + dissolveBoost * 2);
      const driftX = Math.cos(this.animTime * wisp.drift * 0.63 + wisp.phase) * 14;
      const expand = 1 + dissolveBoost * 0.7;
      const cx = x + wisp.nx * w + driftX;
      const cy = y + wisp.ny * h + driftY - dissolveBoost * 34;
      const rx = w * wisp.rx * expand * pulse;
      const ry = h * wisp.ry * expand * pulse;
      drawOrganicWisp(
        this.gfx,
        wisp,
        cx,
        cy,
        rx,
        ry,
        this.animTime,
        palette.wisp,
        0.38 * opacity * pulse,
      );
    }

    this.gfx.roundRect(x, y, w, h, 6);
    this.gfx.fill({ color: palette.base, alpha: 0.2 * opacity });

    this.gfx.roundRect(x, y, w, h, 6);
    this.gfx.stroke({ width: 1, color: palette.wisp, alpha: 0.15 * opacity });
  }

  destroy(): void {
    this.gfx.destroy();
    this.root.destroy({ children: true });
  }
}
