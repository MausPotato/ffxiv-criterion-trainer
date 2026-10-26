import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUBBLE_CONFIGURATIONS,
  BUBBLE_DEFAULT_SPEED_TILES_PER_SECOND,
  BUBBLE_RADIUS_TILES,
  BUBBLE_START_DELAY_SECONDS,
  bubblePositionAt,
  randomBubbleConfiguration
} from '../../src/mechanics/ketuduke/bubbles.ts';

test('calibrated bubbles start centered on the boundary, wait, then move one tile every three seconds', () => {
  assert.equal(BUBBLE_RADIUS_TILES, 0.25);
  assert.equal(BUBBLE_START_DELAY_SECONDS, 3);
  assert.equal(BUBBLE_DEFAULT_SPEED_TILES_PER_SECOND, 1 / 3);

  const edgeCoordinate = { top: 'y', right: 'x', bottom: 'y', left: 'x' };
  const expected = { top: 0, right: 4, bottom: 4, left: 0 };
  for (const bubble of BUBBLE_CONFIGURATIONS.A.bubbles) {
    assert.equal(bubble[edgeCoordinate[bubble.side]], expected[bubble.side]);
  }
});

test('each bubble configuration is selected as one complete 16-bubble layout', () => {
  assert.equal(randomBubbleConfiguration(() => 0).id, 'A');
  assert.equal(randomBubbleConfiguration(() => 0.999).id, 'B');

  for (const configuration of Object.values(BUBBLE_CONFIGURATIONS)) {
    assert.equal(configuration.bubbles.length, 16);
    assert.equal(new Set(configuration.bubbles.map(bubble => bubble.id)).size, 16);
    for (const side of ['top', 'right', 'bottom', 'left']) {
      const bubbles = configuration.bubbles.filter(bubble => bubble.side === side);
      assert.equal(bubbles.length, 4);
      assert.deepEqual(bubbles.map(bubble => bubble.group), [1, 1, 2, 2]);
    }
  }
});

test('configuration B reverses the screenshot stagger as a complete layout', () => {
  const lanes = (configuration, side) => configuration.bubbles
    .filter(bubble => bubble.side === side)
    .map(bubble => side === 'top' || side === 'bottom' ? bubble.x : bubble.y);

  assert.deepEqual(lanes(BUBBLE_CONFIGURATIONS.A, 'top'), [1.25, 1.75, 3.25, 3.75]);
  assert.deepEqual(lanes(BUBBLE_CONFIGURATIONS.A, 'left'), [0.25, 0.75, 2.25, 2.75]);
  assert.deepEqual(lanes(BUBBLE_CONFIGURATIONS.B, 'top'), lanes(BUBBLE_CONFIGURATIONS.A, 'left'));
  assert.deepEqual(lanes(BUBBLE_CONFIGURATIONS.B, 'left'), lanes(BUBBLE_CONFIGURATIONS.A, 'top'));
});

test('all four sides move on fixed straight inward vectors', () => {
  const expected = {
    top: [0, 1],
    right: [-1, 0],
    bottom: [0, -1],
    left: [1, 0]
  };

  for (const bubble of BUBBLE_CONFIGURATIONS.A.bubbles) {
    assert.deepEqual(Object.values(bubble.direction), expected[bubble.side]);
    const moved = bubblePositionAt(bubble, 1);
    assert.equal(moved.x, bubble.x + bubble.direction.x);
    assert.equal(moved.y, bubble.y + bubble.direction.y);
  }
});
