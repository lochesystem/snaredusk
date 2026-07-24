export const OPENED_CHEST_HOLD_SEC = 1;
export const OPENED_CHEST_FADE_SEC = 0.35;

export interface OpenedChestPresentation {
  alpha: number;
  scale: number;
  expired: boolean;
}

export function getOpenedChestPresentation(age: number): OpenedChestPresentation {
  if (age < OPENED_CHEST_HOLD_SEC) {
    return { alpha: 1, scale: 1, expired: false };
  }

  const fadeProgress = Math.min(
    1,
    (age - OPENED_CHEST_HOLD_SEC) / OPENED_CHEST_FADE_SEC,
  );
  return {
    alpha: 1 - fadeProgress,
    scale: 1 - fadeProgress * 0.04,
    expired: fadeProgress >= 1,
  };
}
