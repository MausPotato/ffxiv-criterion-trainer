import { clampLalaRuPlayerPosition } from '../../mechanics/lalaru/geometry.ts';
import type { ArenaPoint } from '../../mechanics/lalaru/types.ts';

export const LALARU_PLAYER_MOVE_UNITS_PER_SECOND = 1.6;
export const LALARU_PLAYER_TURN_DEGREES_PER_SECOND = 180;
export const LALARU_MAX_FRAME_DELTA_MS = 50;

export const LALARU_CONTROL_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
  'KeyQ', 'KeyE'
]);

export interface PlayerControlStep {
  position: ArenaPoint;
  facingAngle: number;
  moved: boolean;
  turned: boolean;
}

export function normalizeFacingAngle(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

export function facingAngleFromDelta(delta: ArenaPoint, fallback: number): number {
  if (Math.hypot(delta.x, delta.y) < 1e-7) return fallback;
  return normalizeFacingAngle(Math.atan2(delta.x, -delta.y) * 180 / Math.PI);
}

export function screenVectorToWorldVector(vector: ArenaPoint, cameraRotationDegrees: number): ArenaPoint {
  const radians = -cameraRotationDegrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine
  };
}

export function movementVectorFromCodes(codes: ReadonlySet<string>): ArenaPoint {
  const x = Number(codes.has('KeyD') || codes.has('ArrowRight'))
    - Number(codes.has('KeyA') || codes.has('ArrowLeft'));
  const y = Number(codes.has('KeyS') || codes.has('ArrowDown'))
    - Number(codes.has('KeyW') || codes.has('ArrowUp'));
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

export function turnAxisFromCodes(codes: ReadonlySet<string>): number {
  return Number(codes.has('KeyE')) - Number(codes.has('KeyQ'));
}

export function advancePlayerControl(
  position: ArenaPoint,
  facingAngle: number,
  codes: ReadonlySet<string>,
  deltaMs: number,
  cameraRotationDegrees: number,
  moveSpeed = LALARU_PLAYER_MOVE_UNITS_PER_SECOND,
  turnSpeed = LALARU_PLAYER_TURN_DEGREES_PER_SECOND
): PlayerControlStep {
  const seconds = Math.min(Math.max(deltaMs, 0), LALARU_MAX_FRAME_DELTA_MS) / 1_000;
  const worldMovement = screenVectorToWorldVector(
    movementVectorFromCodes(codes),
    cameraRotationDegrees
  );
  const moved = Math.hypot(worldMovement.x, worldMovement.y) > 0;
  const nextPosition = moved
    ? clampLalaRuPlayerPosition({
        x: position.x + worldMovement.x * moveSpeed * seconds,
        y: position.y + worldMovement.y * moveSpeed * seconds
      })
    : { ...position };
  const turnAxis = turnAxisFromCodes(codes);
  let nextFacing = moved ? facingAngleFromDelta(worldMovement, facingAngle) : facingAngle;
  if (turnAxis !== 0) nextFacing += turnAxis * turnSpeed * seconds;

  return {
    position: nextPosition,
    facingAngle: normalizeFacingAngle(nextFacing),
    moved,
    turned: turnAxis !== 0
  };
}

export function isTextEntryTarget(target: EventTarget | null): boolean {
  const element = target as { tagName?: string; isContentEditable?: boolean } | null;
  if (!element) return false;
  return element.isContentEditable === true
    || element.tagName === 'INPUT'
    || element.tagName === 'TEXTAREA'
    || element.tagName === 'SELECT';
}
