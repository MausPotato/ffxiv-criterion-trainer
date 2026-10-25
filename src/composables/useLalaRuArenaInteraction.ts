import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  LALARU_FIELD_SIZE,
  playerPositionFromDrag,
  type ArenaPoint
} from '../mechanics/lalaru/index.ts';
import {
  cameraPointToWorldPoint,
  cameraRotationDeltaFromHorizontalDrag,
  normalizeCameraRotation
} from '../presentation/lalaru/camera.ts';
import {
  LALARU_CONTROL_CODES,
  advancePlayerControl,
  facingAngleFromDelta,
  isTextEntryTarget
} from '../presentation/lalaru/player-controls.ts';

export interface LalaRuArenaInteractionOptions {
  getPlayerPosition: () => ArenaPoint;
  canMove: () => boolean;
  updatePlayerPosition: (position: ArenaPoint) => void;
  getFacingAngle?: () => number;
  updateFacingAngle?: (facingAngle: number) => void;
}

export function useLalaRuArenaInteraction(options: LalaRuArenaInteractionOptions) {
  const cameraViewport = ref<HTMLElement | null>(null);
  const dragging = ref(false);
  const cameraRotation = ref(0);
  const rotatingCamera = ref(false);
  let playerPointerId: number | null = null;
  let cameraPointerId: number | null = null;
  let grabOffset: ArenaPoint = { x: 0, y: 0 };
  let lastCameraPointerX = 0;
  const pressedCodes = new Set<string>();
  let animationFrame: number | null = null;
  let previousFrameTime: number | null = null;

  const cameraStyle = computed(() => ({ '--camera-rotation': `${cameraRotation.value}deg` }));

  function pointerArenaPosition(event: PointerEvent): ArenaPoint | null {
    const bounds = cameraViewport.value?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return null;
    const cameraPoint = {
      x: (event.clientX - bounds.left) / bounds.width * LALARU_FIELD_SIZE,
      y: (event.clientY - bounds.top) / bounds.height * LALARU_FIELD_SIZE
    };
    return cameraPointToWorldPoint(cameraPoint, cameraRotation.value);
  }

  function beginPlayerDrag(event: PointerEvent): void {
    if (event.button !== 0 || !options.canMove() || playerPointerId !== null) return;
    const pointer = pointerArenaPosition(event);
    if (!pointer) return;
    playerPointerId = event.pointerId;
    dragging.value = true;
    const player = options.getPlayerPosition();
    grabOffset = { x: pointer.x - player.x, y: pointer.y - player.y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function movePlayer(event: PointerEvent): void {
    if (event.pointerId !== playerPointerId) return;
    const pointer = pointerArenaPosition(event);
    if (!pointer) return;
    const previous = options.getPlayerPosition();
    const next = playerPositionFromDrag(pointer, grabOffset);
    options.updatePlayerPosition(next);
    if (options.updateFacingAngle && options.getFacingAngle) {
      options.updateFacingAngle(facingAngleFromDelta({
        x: next.x - previous.x,
        y: next.y - previous.y
      }, options.getFacingAngle()));
    }
    event.preventDefault();
  }

  function endPlayerDrag(event: PointerEvent): void {
    if (event.pointerId !== playerPointerId) return;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    playerPointerId = null;
    dragging.value = false;
    event.preventDefault();
  }

  function rotateCameraBy(degrees: number): void {
    cameraRotation.value = normalizeCameraRotation(cameraRotation.value + degrees);
  }

  function beginCameraDrag(event: PointerEvent): void {
    if (event.button !== 2 || cameraPointerId !== null) return;
    cameraPointerId = event.pointerId;
    rotatingCamera.value = true;
    lastCameraPointerX = event.clientX;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveCamera(event: PointerEvent): void {
    if (event.pointerId !== cameraPointerId) return;
    const deltaX = event.clientX - lastCameraPointerX;
    lastCameraPointerX = event.clientX;
    rotateCameraBy(cameraRotationDeltaFromHorizontalDrag(deltaX));
    event.preventDefault();
  }

  function endCameraDrag(event: PointerEvent): void {
    if (event.pointerId !== cameraPointerId) return;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    cameraPointerId = null;
    rotatingCamera.value = false;
    event.preventDefault();
  }

  function resetCamera(): void {
    cameraRotation.value = 0;
  }

  function runControlFrame(timestamp: number): void {
    const deltaMs = previousFrameTime === null ? 0 : timestamp - previousFrameTime;
    previousFrameTime = timestamp;
    if (options.canMove() && pressedCodes.size > 0) {
      const step = advancePlayerControl(
        options.getPlayerPosition(),
        options.getFacingAngle?.() ?? 0,
        pressedCodes,
        deltaMs,
        cameraRotation.value
      );
      if (step.moved) options.updatePlayerPosition(step.position);
      if ((step.moved || step.turned) && options.updateFacingAngle) {
        options.updateFacingAngle(step.facingAngle);
      }
    }
    if (pressedCodes.size > 0) animationFrame = requestAnimationFrame(runControlFrame);
    else {
      animationFrame = null;
      previousFrameTime = null;
    }
  }

  function ensureControlFrame(): void {
    if (animationFrame === null) animationFrame = requestAnimationFrame(runControlFrame);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (!LALARU_CONTROL_CODES.has(event.code) || isTextEntryTarget(event.target) || !options.canMove()) return;
    pressedCodes.add(event.code);
    event.preventDefault();
    ensureControlFrame();
  }

  function handleKeyUp(event: KeyboardEvent): void {
    if (!LALARU_CONTROL_CODES.has(event.code) || !pressedCodes.delete(event.code)) return;
    if (options.canMove() && !isTextEntryTarget(event.target)) event.preventDefault();
  }

  function clearPressedKeys(): void {
    pressedCodes.clear();
    previousFrameTime = null;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearPressedKeys);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', clearPressedKeys);
    clearPressedKeys();
  });

  return {
    cameraViewport,
    dragging,
    cameraRotation,
    rotatingCamera,
    cameraStyle,
    beginPlayerDrag,
    movePlayer,
    endPlayerDrag,
    rotateCameraBy,
    beginCameraDrag,
    moveCamera,
    endCameraDrag,
    resetCamera
  };
}
