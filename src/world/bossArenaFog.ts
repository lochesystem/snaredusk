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

function buildWisps(seed: number, count = 18): FogWisp[] {
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
      rx: 0.08 + rand() * 0.16,
      ry: 0.06 + rand() * 0.12,
      phase: rand() * Math.PI * 2,
      drift: 0.4 + rand() * 0.9,
    });
  }
  return wisps;
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
    this.gfx.fill({ color: palette.base, alpha: 0.72 * opacity });

    for (const wisp of this.wisps) {
      const pulse = 0.75 + Math.sin(this.animTime * 1.6 + wisp.phase) * 0.25;
      const driftY = Math.sin(this.animTime * wisp.drift + wisp.phase) * 8 * (1 + dissolveBoost * 2);
      const driftX = Math.cos(this.animTime * wisp.drift * 0.7 + wisp.phase) * 5;
      const expand = 1 + dissolveBoost * 0.45;
      const cx = x + wisp.nx * w + driftX;
      const cy = y + wisp.ny * h + driftY - dissolveBoost * 28;
      const rx = w * wisp.rx * expand * pulse;
      const ry = h * wisp.ry * expand * pulse;
      this.gfx.ellipse(cx, cy, rx, ry);
      this.gfx.fill({ color: palette.wisp, alpha: 0.22 * opacity * pulse });
    }

    this.gfx.roundRect(x, y, w, h, 6);
    this.gfx.fill({ color: palette.base, alpha: 0.28 * opacity });

    this.gfx.roundRect(x, y, w, h, 6);
    this.gfx.stroke({ width: 1, color: palette.wisp, alpha: 0.15 * opacity });
  }

  destroy(): void {
    this.gfx.destroy();
    this.root.destroy({ children: true });
  }
}
