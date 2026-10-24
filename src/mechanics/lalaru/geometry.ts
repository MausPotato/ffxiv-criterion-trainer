import type { ArenaPoint, CardinalDirection } from './types.ts';

export const LALARU_FIELD_SIZE = 5;
export const LALARU_BOSS_POSITION: Readonly<ArenaPoint> = { x: 2.5, y: 2.5 };
export const LALARU_PLAYER_RADIUS = 0.18;
export const LALARU_PLAYER_START: Readonly<ArenaPoint> = { x: 2.5, y: 3.7 };
export const SAFE_SECTOR_DEGREES = 90;

const DIRECTION_DEGREES: Readonly<Record<CardinalDirection, number>> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function clampLalaRuPlayerPosition(point: ArenaPoint): ArenaPoint {
  const minimum = LALARU_PLAYER_RADIUS;
  const maximum = LALARU_FIELD_SIZE - LALARU_PLAYER_RADIUS;
  return {
    x: clamp(point.x, minimum, maximum),
    y: clamp(point.y, minimum, maximum)
  };
}

export function playerPositionFromDrag(
  pointer: ArenaPoint,
  grabOffset: ArenaPoint
): ArenaPoint {
  return clampLalaRuPlayerPosition({
    x: pointer.x - grabOffset.x,
    y: pointer.y - grabOffset.y
  });
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** 0° is north and positive angles turn clockwise, matching the arena view. */
export function directionDegrees(direction: CardinalDirection): number {
  return DIRECTION_DEGREES[direction];
}

export function pointDirectionDegrees(point: ArenaPoint, center = LALARU_BOSS_POSITION): number {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return normalizeDegrees(Math.atan2(dx, -dy) * 180 / Math.PI);
}

export function isPointInSafeSector(
  point: ArenaPoint,
  safeDirection: CardinalDirection,
  center = LALARU_BOSS_POSITION
): boolean {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (Math.hypot(dx, dy) < 1e-7) return false;
  const delta = Math.abs(normalizeDegrees(pointDirectionDegrees(point, center)
    - directionDegrees(safeDirection) + 180) - 180);
  return delta <= SAFE_SECTOR_DEGREES / 2 + 1e-7;
}

function polarPoint(angleDegrees: number, radius: number): ArenaPoint {
  const radians = angleDegrees * Math.PI / 180;
  return {
    x: 50 + Math.sin(radians) * radius,
    y: 50 - Math.cos(radians) * radius
  };
}

function format(value: number): string {
  return value.toFixed(3).replace(/\.000$/, '');
}

/** SVG path for the 270° attacked sector. It is centered on the boss and clipped by the arena. */
export function attackSectorPath(safeDirection: CardinalDirection, radius = 72): string {
  const startAngle = directionDegrees(safeDirection) + SAFE_SECTOR_DEGREES / 2;
  const endAngle = startAngle + (360 - SAFE_SECTOR_DEGREES);
  const start = polarPoint(startAngle, radius);
  const end = polarPoint(endAngle, radius);
  return `M 50 50 L ${format(start.x)} ${format(start.y)} A ${radius} ${radius} 0 1 1 ${format(end.x)} ${format(end.y)} Z`;
}

/** SVG path for the 90° safe sector, used only after settlement in tutorial mode. */
export function safeSectorPath(safeDirection: CardinalDirection, radius = 72): string {
  const startAngle = directionDegrees(safeDirection) - SAFE_SECTOR_DEGREES / 2;
  const endAngle = startAngle + SAFE_SECTOR_DEGREES;
  const start = polarPoint(startAngle, radius);
  const end = polarPoint(endAngle, radius);
  return `M 50 50 L ${format(start.x)} ${format(start.y)} A ${radius} ${radius} 0 0 1 ${format(end.x)} ${format(end.y)} Z`;
}

export function safeBoundaryLines(safeDirection: CardinalDirection, radius = 72): readonly [ArenaPoint, ArenaPoint] {
  const center = directionDegrees(safeDirection);
  return [
    polarPoint(center - SAFE_SECTOR_DEGREES / 2, radius),
    polarPoint(center + SAFE_SECTOR_DEGREES / 2, radius)
  ];
}
