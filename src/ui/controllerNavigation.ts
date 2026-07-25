export type ControllerDirection = 'up' | 'down' | 'left' | 'right';

export interface NavigationPoint {
  x: number;
  y: number;
}

export function findSpatialNavigationIndex(
  points: readonly NavigationPoint[],
  currentIndex: number,
  direction: ControllerDirection,
): number {
  if (points.length === 0) return -1;
  const origin = points[Math.max(0, Math.min(points.length - 1, currentIndex))] ?? points[0]!;
  const horizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  let bestIndex = currentIndex;
  let bestScore = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    if (index === currentIndex) return;
    const primary = horizontal ? point.x - origin.x : point.y - origin.y;
    if (primary * sign <= 1) return;
    const secondary = horizontal ? point.y - origin.y : point.x - origin.x;
    const score = Math.abs(primary) + Math.abs(secondary) * 2.4;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}
