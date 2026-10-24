import test from 'node:test';
import assert from 'node:assert/strict';
import { solveQuestion } from '../../src/mechanics/lalaru/solver.ts';
import {
  cameraPointToWorldPoint,
  cameraRotationDeltaFromHorizontalDrag,
  normalizeCameraRotation,
  worldPointToCameraPoint
} from '../../src/presentation/lalaru/camera.ts';

function assertPointClose(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual.x - expected.x) <= epsilon, `expected x=${expected.x}, got ${actual.x}`);
  assert.ok(Math.abs(actual.y - expected.y) <= epsilon, `expected y=${expected.y}, got ${actual.y}`);
}

test('camera rotation normalizes while preserving exact 90 degree button steps', () => {
  assert.equal(normalizeCameraRotation(90), 90);
  assert.equal(normalizeCameraRotation(-90), -90);
  assert.equal(normalizeCameraRotation(270), -90);
  assert.equal(normalizeCameraRotation(450), 90);
});

test('right-button horizontal dragging rotates opposite to pointer movement', () => {
  assert.ok(cameraRotationDeltaFromHorizontalDrag(100) < 0);
  assert.ok(cameraRotationDeltaFromHorizontalDrag(-100) > 0);
});

test('arbitrary camera transforms round-trip pointer positions back to world coordinates', () => {
  const worldPoints = [
    { x: 0.18, y: 0.18 },
    { x: 1.2, y: 3.8 },
    { x: 2.5, y: 2.5 },
    { x: 4.82, y: 4.82 }
  ];

  for (const rotation of [-137, -90, -45, 0, 33, 90, 164]) {
    for (const worldPoint of worldPoints) {
      const cameraPoint = worldPointToCameraPoint(worldPoint, rotation);
      assertPointClose(cameraPointToWorldPoint(cameraPoint, rotation), worldPoint);
    }
  }
});

test('camera keeps a fixed scale and produces outside points for viewport clipping', () => {
  const displayedCorner = worldPointToCameraPoint({ x: 0, y: 0 }, 45);
  assert.ok(displayedCorner.x > 2.49 && displayedCorner.x < 2.51);
  assert.ok(displayedCorner.y < 0);
});

test('west initial safe rotates to screen bottom while south final safe appears screen right', () => {
  const solution = solveQuestion({
    initialSafeDirection: 'west',
    arrowSide: 'left',
    multiplier: 'III',
    dotPattern: 5
  });
  assert.deepEqual(solution, { selectedSide: 'right', finalSafeDirection: 'south' });

  const rotation = -90;
  assertPointClose(worldPointToCameraPoint({ x: 0.5, y: 2.5 }, rotation), { x: 2.5, y: 4.5 });
  assertPointClose(worldPointToCameraPoint({ x: 2.5, y: 4.5 }, rotation), { x: 4.5, y: 2.5 });
});

test('camera transforms do not mutate world coordinates', () => {
  const worldPoint = Object.freeze({ x: 1.1, y: 4.2 });
  worldPointToCameraPoint(worldPoint, 48);
  assert.deepEqual(worldPoint, { x: 1.1, y: 4.2 });
});
