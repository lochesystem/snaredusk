import { Container, Graphics } from 'pixi.js';
import type { BiomeId } from '../data/biomes.ts';
import type { EnemyCombatPhase } from '../systems/enemyCombat.ts';
import type { FxRunner } from '../engine/fxRunner.ts';

const BOSS_AURA_COLORS: Record<BiomeId, number> = {
  floresta: 0x6ecf68,
  cristal: 0x88a8ff,
  termal: 0xff7040,
};

interface BossVfxState {
  aura: Graphics | null;
  lastPhase: EnemyCombatPhase;
  enragePulse: number;
}

const bossVfxById = new Map<string, BossVfxState>();

function getOrCreateState(enemyId: string): BossVfxState {
  let state = bossVfxById.get(enemyId);
  if (!state) {
    state = { aura: null, lastPhase: 'idle', enragePulse: 0 };
    bossVfxById.set(enemyId, state);
  }
  return state;
}

export function clearBossVfxState(enemyId: string): void {
  const state = bossVfxById.get(enemyId);
  if (state?.aura) {
    state.aura.parent?.removeChild(state.aura);
    state.aura.destroy();
  }
  bossVfxById.delete(enemyId);
}

export function clearAllBossVfx(): void {
  for (const id of [...bossVfxById.keys()]) clearBossVfxState(id);
}

function ensureAura(fxLayer: Container, enemyId: string): Graphics {
  const state = getOrCreateState(enemyId);
  if (!state.aura) {
    state.aura = new Graphics({ roundPixels: true });
    state.aura.zIndex = -1;
    fxLayer.addChild(state.aura);
  }
  return state.aura;
}

export function tickBossCombatVfx(
  enemy: {
    id: string;
    x: number;
    y: number;
    combatPhase: EnemyCombatPhase;
    bossCombatPhase: 1 | 2;
  },
  biomeId: BiomeId,
  fxLayer: Container,
  dt: number,
): void {
  const state = getOrCreateState(enemy.id);
  const color = BOSS_AURA_COLORS[biomeId] ?? 0xc4f082;
  const aura = ensureAura(fxLayer, enemy.id);

  if (enemy.combatPhase === 'idle') {
    aura.clear();
    aura.visible = false;
    state.lastPhase = 'idle';
    return;
  }

  aura.visible = true;
  const pulse = 0.5 + Math.sin(Date.now() * 0.012) * 0.15;
  const radius =
    enemy.combatPhase === 'windup' ? 16 + pulse * 4 :
    enemy.combatPhase === 'charge' ? 20 + pulse * 6 :
    enemy.combatPhase === 'leap' ? 14 + pulse * 8 :
    12 + pulse * 3;

  aura.clear();
  aura.circle(enemy.x, enemy.y - 2, radius);
  aura.fill({ color, alpha: enemy.combatPhase === 'windup' ? 0.22 : 0.14 });
  aura.circle(enemy.x, enemy.y - 2, radius + 3);
  aura.stroke({ width: 1, color, alpha: 0.35 });

  if (enemy.combatPhase === 'charge') {
    aura.moveTo(enemy.x, enemy.y);
    aura.lineTo(enemy.x + 28, enemy.y);
    aura.stroke({ width: 2, color: 0xff4040, alpha: 0.5 });
  }

  state.lastPhase = enemy.combatPhase;
  state.enragePulse += dt;
}

export function applyBossEnrageTint(
  container: { alpha: number },
  bossCombatPhase: 1 | 2,
): void {
  if (bossCombatPhase < 2) {
    container.alpha = 1;
    return;
  }
  const pulse = 0.88 + Math.sin(Date.now() * 0.008) * 0.12;
  container.alpha = pulse;
}

export function spawnBossPhaseTransitionVfx(
  fxLayer: Container,
  x: number,
  y: number,
  fxRunner: FxRunner,
): void {
  const ring = new Graphics({ roundPixels: true });
  fxLayer.addChild(ring);

  fxRunner.spawn(
    0.55,
    (progress) => {
      const radius = 8 + progress * 48;
      ring.clear();
      ring.circle(x, y, radius);
      ring.stroke({ width: 3 - progress * 2, color: 0xff6030, alpha: 1 - progress });
    },
    () => {
      fxLayer.removeChild(ring);
      ring.destroy();
    },
  );
}

export function spawnHeatWaveVfx(
  fxLayer: Container,
  x: number,
  y: number,
  fxRunner: FxRunner,
): void {
  const wave = new Graphics({ roundPixels: true });
  fxLayer.addChild(wave);

  fxRunner.spawn(
    0.45,
    (progress) => {
      const radius = 12 + progress * 78;
      wave.clear();
      wave.circle(x, y, radius);
      wave.stroke({ width: 4 - progress * 3, color: 0xff8040, alpha: 0.7 * (1 - progress) });
      wave.circle(x, y, radius * 0.55);
      wave.stroke({ width: 2, color: 0xffc080, alpha: 0.4 * (1 - progress) });
    },
    () => {
      fxLayer.removeChild(wave);
      wave.destroy();
    },
  );
}

export function spawnBossLeapImpactVfx(
  fxLayer: Container,
  x: number,
  y: number,
  fxRunner: FxRunner,
): void {
  const impact = new Graphics({ roundPixels: true });
  fxLayer.addChild(impact);

  fxRunner.spawn(
    0.25,
    (progress) => {
      const radius = 6 + progress * 22;
      impact.clear();
      impact.ellipse(x, y + 4, radius, radius * 0.45);
      impact.fill({ color: 0x403020, alpha: 0.35 * (1 - progress) });
    },
    () => {
      fxLayer.removeChild(impact);
      impact.destroy();
    },
  );
}
