import type {
  ArrowSide,
  RingTurnDirection
} from '../../mechanics/lalaru/types.ts';

export type RightAnglePosition = 'top' | 'left' | 'right';
export type DotPosition = readonly [number, number];

const DOT_LAYOUTS: Readonly<Record<number, readonly DotPosition[]>> = {
  1: [[50, 50]],
  2: [[34, 34], [66, 66]],
  3: [[34, 34], [50, 50], [66, 66]],
  4: [[34, 34], [66, 34], [34, 66], [66, 66]],
  5: [[34, 34], [66, 34], [50, 50], [34, 66], [66, 66]]
};

export function ringTurnDirectionForArrowSide(arrowSide: ArrowSide): RingTurnDirection {
  return arrowSide === 'left' ? 'clockwise' : 'counterclockwise';
}

export function ringRotationDegrees(direction: RingTurnDirection): number {
  return direction === 'clockwise' ? 90 : -90;
}

export function triangleDestinationSide(arrowSide: ArrowSide): ArrowSide {
  return arrowSide === 'left' ? 'right' : 'left';
}

/**
 * The right-angle marker snaps rather than travels: odd dot counts show north,
 * even dot counts show the cue side.
 */
export function rightAngleMarkerPosition(
  arrowSide: ArrowSide,
  dotCount: number
): RightAnglePosition {
  if (dotCount <= 0) return 'top';
  return dotCount % 2 === 1 ? 'top' : triangleDestinationSide(arrowSide);
}

export function countdownDotLayout(count: number): readonly DotPosition[] {
  if (count <= 0) return [];
  return DOT_LAYOUTS[count] ?? DOT_LAYOUTS[1]!;
}
