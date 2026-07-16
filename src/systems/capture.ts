/** Taxa mínima com HP cheio (estilo Pokémon/Palworld — sempre pode tentar). */
export const CAPTURE_MIN_CHANCE = 0.05;
export const CAPTURE_MAX_CHANCE = 0.85;
/** Bônus quadrático conforme o monstro enfraquece. */
export const CAPTURE_HP_CURVE = 0.8;

export interface CaptureRollInput {
  targetHp: number;
  targetMaxHp: number;
  rarityPenalty?: number;
}

export type CaptureFailResult = 'enrage' | 'flee';

/** Qualquer inimigo vivo pode ser alvo; a taxa é que penaliza HP alto. */
export function canTargetForCapture(hp: number, maxHp: number): boolean {
  return maxHp > 0 && hp > 0;
}

/**
 * Taxa de captura escala com HP restante (Palworld / Pokémon).
 * HP 100% → ~5% · HP 50% → ~25% · HP 25% → ~50% · HP 10% → ~70%
 */
export function rollCaptureChance(input: CaptureRollInput): number {
  const { targetHp, targetMaxHp, rarityPenalty = 0 } = input;
  if (!canTargetForCapture(targetHp, targetMaxHp)) return 0;

  const hpRatio = targetHp / targetMaxHp;
  const weakness = 1 - hpRatio;
  const rate = CAPTURE_MIN_CHANCE + weakness * weakness * CAPTURE_HP_CURVE;

  return Math.max(CAPTURE_MIN_CHANCE, Math.min(CAPTURE_MAX_CHANCE, rate - rarityPenalty));
}

export function formatCaptureChance(input: CaptureRollInput): string {
  return `${Math.round(rollCaptureChance(input) * 100)}%`;
}

export function rollCaptureSuccess(input: CaptureRollInput, rng: () => number = Math.random): boolean {
  return rng() < rollCaptureChance(input);
}

export function rollCaptureFailure(rng: () => number = Math.random): CaptureFailResult {
  return rng() < 0.6 ? 'enrage' : 'flee';
}
