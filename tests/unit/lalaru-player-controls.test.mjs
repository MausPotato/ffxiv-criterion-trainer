import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advancePlayerControl,
  facingAngleFromDelta,
  isTextEntryTarget,
  movementVectorFromCodes,
  screenVectorToWorldVector
} from '../../src/presentation/lalaru/player-controls.ts';

function close(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${expected}, got ${actual}`);
}

test('WASD and arrow keys produce the same screen-relative directions', () => {
  assert.deepEqual(movementVectorFromCodes(new Set(['KeyW'])), { x: 0, y: -1 });
  assert.deepEqual(movementVectorFromCodes(new Set(['ArrowUp'])), { x: 0, y: -1 });
  assert.deepEqual(movementVectorFromCodes(new Set(['KeyA'])), { x: -1, y: 0 });
  assert.deepEqual(movementVectorFromCodes(new Set(['ArrowLeft'])), { x: -1, y: 0 });
  assert.deepEqual(movementVectorFromCodes(new Set(['KeyS'])), { x: 0, y: 1 });
  assert.deepEqual(movementVectorFromCodes(new Set(['ArrowDown'])), { x: 0, y: 1 });
  assert.deepEqual(movementVectorFromCodes(new Set(['KeyD'])), { x: 1, y: 0 });
  assert.deepEqual(movementVectorFromCodes(new Set(['ArrowRight'])), { x: 1, y: 0 });
});

test('diagonal movement is normalized to the same speed as a cardinal direction', () => {
  const diagonal = movementVectorFromCodes(new Set(['KeyW', 'KeyD']));
  close(Math.hypot(diagonal.x, diagonal.y), 1);

  const straight = advancePlayerControl({ x: 2.5, y: 2.5 }, 0, new Set(['KeyW']), 50, 0);
  const diagonalStep = advancePlayerControl({ x: 2.5, y: 2.5 }, 0, new Set(['KeyW', 'KeyD']), 50, 0);
  close(Math.hypot(straight.position.x - 2.5, straight.position.y - 2.5),
    Math.hypot(diagonalStep.position.x - 2.5, diagonalStep.position.y - 2.5));
});

test('screen movement is converted back into world movement after camera rotation', () => {
  const world = screenVectorToWorldVector({ x: 0, y: -1 }, 90);
  close(world.x, -1);
  close(world.y, 0);

  const step = advancePlayerControl({ x: 2.5, y: 2.5 }, 0, new Set(['KeyW']), 50, 90);
  assert.ok(step.position.x < 2.5);
  close(step.position.y, 2.5);
  close(step.facingAngle, -90);
});

test('movement updates facing while stopping preserves the last facing', () => {
  assert.equal(facingAngleFromDelta({ x: 1, y: 0 }, 12), 90);
  const moving = advancePlayerControl({ x: 2.5, y: 2.5 }, -35, new Set(['KeyS']), 50, 0);
  assert.equal(moving.facingAngle, 180);
  const stopped = advancePlayerControl(moving.position, moving.facingAngle, new Set(), 50, 0);
  assert.equal(stopped.facingAngle, 180);
  assert.equal(stopped.moved, false);
});

test('rotating the camera alone never changes world-facing state', () => {
  for (const cameraRotation of [-137, -90, 45, 90, 164]) {
    const step = advancePlayerControl({ x: 2.5, y: 2.5 }, 37, new Set(), 50, cameraRotation);
    assert.equal(step.facingAngle, 37);
    assert.deepEqual(step.position, { x: 2.5, y: 2.5 });
  }
});

test('Q and E rotate in place continuously without changing position', () => {
  const left = advancePlayerControl({ x: 2.5, y: 2.5 }, 0, new Set(['KeyQ']), 50, 0);
  const right = advancePlayerControl({ x: 2.5, y: 2.5 }, 0, new Set(['KeyE']), 50, 0);
  assert.deepEqual(left.position, { x: 2.5, y: 2.5 });
  assert.deepEqual(right.position, { x: 2.5, y: 2.5 });
  assert.ok(left.facingAngle < 0);
  assert.ok(right.facingAngle > 0);
  assert.equal(left.turned, true);
  assert.equal(right.turned, true);
});

test('movement is clamped to the arena and large frame gaps are capped', () => {
  const edge = advancePlayerControl({ x: .18, y: .18 }, 0, new Set(['KeyW', 'KeyA']), 10_000, 0);
  assert.deepEqual(edge.position, { x: .18, y: .18 });

  const capped = advancePlayerControl({ x: 2.5, y: 2.5 }, 0, new Set(['KeyD']), 10_000, 0);
  close(capped.position.x, 2.58);
});

test('text-entry targets are excluded from trainer keyboard capture', () => {
  assert.equal(isTextEntryTarget({ tagName: 'INPUT' }), true);
  assert.equal(isTextEntryTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTextEntryTarget({ tagName: 'SELECT' }), true);
  assert.equal(isTextEntryTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isTextEntryTarget({ tagName: 'BUTTON' }), false);
});
