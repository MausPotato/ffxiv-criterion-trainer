import { ANALYSIS_GAP_HALF_ANGLE_DEGREES, analysisGapCenterAngle, type AnalysisDebuff } from '../../mechanics/lalaru/analysis.ts';

function polarPoint(angleDegrees: number, radius: number): { x: number; y: number } {
  const radians = angleDegrees * Math.PI / 180;
  return {
    x: 50 + Math.sin(radians) * radius,
    y: 50 - Math.cos(radians) * radius
  };
}

function format(value: number): string {
  return value.toFixed(3).replace(/\.000$/, '');
}

export function analysisRingPath(
  facingAngle: number,
  debuff: AnalysisDebuff,
  radius = 40,
  gapHalfAngle = ANALYSIS_GAP_HALF_ANGLE_DEGREES,
  additionalRotationDegrees = 0
): string {
  const gapCenter = analysisGapCenterAngle(facingAngle, debuff, additionalRotationDegrees);
  const start = polarPoint(gapCenter + gapHalfAngle, radius);
  const end = polarPoint(gapCenter - gapHalfAngle, radius);
  return `M ${format(start.x)} ${format(start.y)} A ${radius} ${radius} 0 1 1 ${format(end.x)} ${format(end.y)}`;
}
