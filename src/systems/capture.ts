/** Taxa mínima com HP cheio (estilo Pokémon/Palworld — sempre pode tentar). */
export const CAPTURE_MIN_CHANCE = 0.05;
export const CAPTURE_MAX_CHANCE = 0.85;
/** Bônus quadrático conforme o monstro enfraquece. */
export const CAPTURE_HP_CURVE = 0.8;

/** Tentativas visíveis (balanços da orbe). */
export const CAPTURE_MIN_SHAKES = 3;
export const CAPTURE_ORB_FLY_SPEED = 130;
export const CAPTURE_ARRIVE_PAUSE = 0.28;
export const CAPTURE_SHAKE_DURATION = 0.52;
export const CAPTURE_SHAKE_PAUSE = 0.38;
export const CAPTURE_SUCCESS_FX_DURATION = 1.35;
export const CAPTURE_FAIL_FX_DURATION = 0.55;

export interface CaptureRollInput {
  targetHp: number;
  targetMaxHp: number;
  rarityPenalty?: number;
  bonusChance?: number;
}


/** Qualquer inimigo vivo pode ser alvo; a taxa é que penaliza HP alto. */
export function canTargetForCapture(hp: number, maxHp: number): boolean {
  return maxHp > 0 && hp > 0;
}

/**
 * Taxa de captura escala com HP restante (Palworld / Pokémon).
 * HP 100% → ~5% · HP 50% → ~25% · HP 25% → ~50% · HP 10% → ~70%
 */
export function rollCaptureChance(input: CaptureRollInput): number {
  const {
    targetHp,
    targetMaxHp,
    rarityPenalty = 0,
    bonusChance = 0,
  } = input;
  if (!canTargetForCapture(targetHp, targetMaxHp)) return 0;

  const hpRatio = targetHp / targetMaxHp;
  const weakness = 1 - hpRatio;
  const rate = CAPTURE_MIN_CHANCE + weakness * weakness * CAPTURE_HP_CURVE;

  return Math.max(
    CAPTURE_MIN_CHANCE,
    Math.min(CAPTURE_MAX_CHANCE, rate - rarityPenalty + bonusChance),
  );
}

export function formatCaptureChance(input: CaptureRollInput): string {
  return `${Math.round(rollCaptureChance(input) * 100)}%`;
}

export function rollCaptureSuccess(input: CaptureRollInput, rng: () => number = Math.random): boolean {
  return rng() < rollCaptureChance(input);
}

export interface CaptureSequencePlan {
  success: boolean;
  /** Índice 1-based da tentativa em que a captura falha; null se sucesso. */
  failAtShake: number | null;
  chance: number;
  totalShakes: number;
}

/** Define o resultado antes da animação (estilo Pokémon — balanços refletem o sorteio). */
export function planCaptureSequence(
  input: CaptureRollInput,
  rng: () => number = Math.random,
): CaptureSequencePlan {
  const chance = rollCaptureChance(input);
  const totalShakes = CAPTURE_MIN_SHAKES;
  const success = rng() < chance;
  if (success) {
    return { success: true, failAtShake: null, chance, totalShakes };
  }
  const r = rng();
  const failAtShake = r < 0.22 ? 1 : r < 0.58 ? 2 : 3;
  return { success: false, failAtShake, chance, totalShakes };
}

export function formatCapturePercent(chance: number): string {
  return `${Math.round(chance * 100)}%`;
}
