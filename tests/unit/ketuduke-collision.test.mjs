import test from 'node:test';
import assert from 'node:assert/strict';
import {
  interpolatePosition,
  sweptCircleCollisionTime
} from '../../src/mechanics/ketuduke/collision.ts';

test('touching visible circle edges counts as collision', () => {
  assert.equal(
    sweptCircleCollisionTime(
      { x: 0, y: 0 }, { x: 0, y: 0 }, 0.25,
      { x: 0.43, y: 0 }, { x: 0.43, y: 0 }, 0.18
    ),
    0
  );
});

test('fast dragging cannot tunnel through a bubble', () => {
  const time = sweptCircleCollisionTime(
    { x: 0, y: 2 }, { x: 4, y: 2 }, 0.18,
    { x: 2, y: 2 }, { x: 2, y: 2 }, 0.25
  );
  assert.ok(time !== null && time > 0 && time < 1);
  const contact = interpolatePosition({ x: 0, y: 2 }, { x: 4, y: 2 }, time);
  assert.ok(Math.abs(contact.x - 1.57) < 1e-12);
  assert.equal(contact.y, 2);
});

test('parallel near miss remains safe and moving bubbles use relative motion', () => {
  assert.equal(
    sweptCircleCollisionTime(
      { x: 0, y: 0 }, { x: 4, y: 0 }, 0.18,
      { x: 2, y: 1 }, { x: 2, y: 1 }, 0.25
    ),
    null
  );
  assert.notEqual(
    sweptCircleCollisionTime(
      { x: 0, y: 2 }, { x: 4, y: 2 }, 0.25,
      { x: 4, y: 2 }, { x: 0, y: 2 }, 0.18
    ),
    null
  );
});
