import type { BubbleVector } from '../../mechanics/ketuduke/bubbles.ts';

export const PLAYER_START_POSITION: Readonly<BubbleVector> = { x: 2, y: 2 };
export const PLAYER_RADIUS_TILES = 0.18;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function clampPlayerPosition(position: BubbleVector): BubbleVector {
  const minimum = PLAYER_RADIUS_TILES;
  const maximum = 4 - PLAYER_RADIUS_TILES;
  return {
    x: clamp(position.x, minimum, maximum),
    y: clamp(position.y, minimum, maximum)
  };
}

export function playerPositionFromDrag(
  pointerPosition: BubbleVector,
  grabOffset: BubbleVector
): BubbleVector {
  return clampPlayerPosition({
    x: pointerPosition.x - grabOffset.x,
    y: pointerPosition.y - grabOffset.y
  });
}
