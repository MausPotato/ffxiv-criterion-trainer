import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER_RADIUS_TILES,
  PLAYER_START_POSITION,
  clampPlayerPosition,
  playerPositionFromDrag
} from '../../src/presentation/ketuduke/player-drag.ts';

test('player begins at arena center', () => {
  assert.deepEqual(PLAYER_START_POSITION, { x: 2, y: 2 });
});

test('dragging preserves the original grab offset instead of jumping to the pointer', () => {
  assert.deepEqual(
    playerPositionFromDrag({ x: 3, y: 2.5 }, { x: 0.2, y: -0.1 }),
    { x: 2.8, y: 2.6 }
  );
});

test('player circle stays fully inside all arena boundaries', () => {
  assert.deepEqual(
    clampPlayerPosition({ x: -3, y: 9 }),
    { x: PLAYER_RADIUS_TILES, y: 4 - PLAYER_RADIUS_TILES }
  );
  assert.deepEqual(clampPlayerPosition({ x: 1.25, y: 2.75 }), { x: 1.25, y: 2.75 });
});
