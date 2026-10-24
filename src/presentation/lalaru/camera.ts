import type { ArenaPoint } from '../../mechanics/lalaru/types.ts';

export const CAMERA_ROTATION_STEP_DEGREES = 90;
export const CAMERA_DRAG_DEGREES_PER_PIXEL = 0.35;

const CAMERA_CENTER: Readonly<ArenaPoint> = { x: 2.5, y: 2.5 };

export function normalizeCameraRotation(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

export function cameraRotationDeltaFromHorizontalDrag(deltaX: number): number {
  return -deltaX * CAMERA_DRAG_DEGREES_PER_PIXEL;
}

/** Applies the visual camera transform without changing the supplied world point. */
export function worldPointToCameraPoint(
  point: ArenaPoint,
  rotationDegrees: number,
  scale = 1,
  center: ArenaPoint = CAMERA_CENTER
): ArenaPoint {
  const radians = rotationDegrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + (dx * cosine - dy * sine) * scale,
    y: center.y + (dx * sine + dy * cosine) * scale
  };
}

/** Inverse camera transform used to convert a pointer position back to world coordinates. */
export function cameraPointToWorldPoint(
  point: ArenaPoint,
  rotationDegrees: number,
  scale = 1,
  center: ArenaPoint = CAMERA_CENTER
): ArenaPoint {
  const radians = -rotationDegrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const dx = (point.x - center.x) / scale;
  const dy = (point.y - center.y) / scale;
  return {
    x: center.x + dx * cosine - dy * sine,
    y: center.y + dx * sine + dy * cosine
  };
}
