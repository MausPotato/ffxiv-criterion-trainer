import type { BubbleVector } from './bubbles.ts';

function dot(a: BubbleVector, b: BubbleVector): number {
  return a.x * b.x + a.y * b.y;
}

/** Returns the first normalized time (0..1) at which two swept circles touch. */
export function sweptCircleCollisionTime(
  aStart: BubbleVector,
  aEnd: BubbleVector,
  aRadius: number,
  bStart: BubbleVector,
  bEnd: BubbleVector,
  bRadius: number
): number | null {
  const relativeStart = { x: aStart.x - bStart.x, y: aStart.y - bStart.y };
  const relativeDelta = {
    x: (aEnd.x - aStart.x) - (bEnd.x - bStart.x),
    y: (aEnd.y - aStart.y) - (bEnd.y - bStart.y)
  };
  const radius = aRadius + bRadius;
  const c = dot(relativeStart, relativeStart) - radius * radius;
  if (c <= 0) return 0;

  const a = dot(relativeDelta, relativeDelta);
  if (a === 0) return null;
  const b = 2 * dot(relativeStart, relativeDelta);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const time = (-b - Math.sqrt(discriminant)) / (2 * a);
  return time >= 0 && time <= 1 ? time : null;
}

export function interpolatePosition(
  start: BubbleVector,
  end: BubbleVector,
  time: number
): BubbleVector {
  return {
    x: start.x + (end.x - start.x) * time,
    y: start.y + (end.y - start.y) * time
  };
}
