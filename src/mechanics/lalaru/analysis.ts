import type { ArenaPoint } from './types.ts';
import type { ArrowSide, Multiplier } from './types.ts';
import { pointDirectionDegrees } from './geometry.ts';
import { selectSide } from './solver.ts';

export type AnalysisDebuff = 'front' | 'back' | 'left' | 'right';

export interface AnalysisQuestion {
  debuff: AnalysisDebuff;
  orbPosition: ArenaPoint;
}

export const ANALYSIS_GAP_HALF_ANGLE_DEGREES = 45;

const DEBUFF_OFFSETS: Readonly<Record<AnalysisDebuff, number>> = {
  front: 0,
  right: 90,
  back: 180,
  left: -90
};

function normalizeSignedDegrees(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

export function analysisRotationOffsetDegrees(
  arrowSide: ArrowSide,
  multiplier: Multiplier
): number {
  return selectSide(arrowSide, multiplier) === 'left' ? -90 : 90;
}

export function analysisGapCenterAngle(
  facingAngle: number,
  debuff: AnalysisDebuff,
  additionalRotationDegrees = 0
): number {
  return normalizeSignedDegrees(facingAngle + DEBUFF_OFFSETS[debuff] + additionalRotationDegrees);
}

export function signedAngleDifference(a: number, b: number): number {
  return normalizeSignedDegrees(a - b);
}

export function attackSourceAngle(playerPosition: ArenaPoint, orbPosition: ArenaPoint): number | null {
  if (Math.hypot(orbPosition.x - playerPosition.x, orbPosition.y - playerPosition.y) < 1e-7) return null;
  return pointDirectionDegrees(orbPosition, playerPosition);
}

export function isAttackInAnalysisGap(
  playerPosition: ArenaPoint,
  facingAngle: number,
  debuff: AnalysisDebuff,
  orbPosition: ArenaPoint,
  gapHalfAngle = ANALYSIS_GAP_HALF_ANGLE_DEGREES,
  additionalRotationDegrees = 0
): boolean {
  const sourceAngle = attackSourceAngle(playerPosition, orbPosition);
  if (sourceAngle === null) return false;
  return Math.abs(signedAngleDifference(
    sourceAngle,
    analysisGapCenterAngle(facingAngle, debuff, additionalRotationDegrees)
  ))
    <= gapHalfAngle + 1e-7;
}

const ANALYSIS_ORB_POSITIONS: readonly ArenaPoint[] = [
  { x: .5, y: .5 },
  { x: 2.5, y: .5 },
  { x: 4.5, y: .5 },
  { x: 4.5, y: 2.5 },
  { x: 4.5, y: 4.5 },
  { x: 2.5, y: 4.5 },
  { x: .5, y: 4.5 },
  { x: .5, y: 2.5 }
];
const ANALYSIS_DEBUFFS: readonly AnalysisDebuff[] = ['front', 'back', 'left', 'right'];

export function generateAnalysisQuestion(random: () => number = Math.random): AnalysisQuestion {
  const debuff = ANALYSIS_DEBUFFS[Math.floor(random() * ANALYSIS_DEBUFFS.length)]!;
  const orbPosition = ANALYSIS_ORB_POSITIONS[Math.floor(random() * ANALYSIS_ORB_POSITIONS.length)]!;
  return { debuff, orbPosition: { ...orbPosition } };
}
