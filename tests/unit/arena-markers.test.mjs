import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_MARKERS } from '../../src/presentation/arena-markers.ts';

test('shared arena markers place letters on cardinals and numbers in corner tiles', () => {
  assert.deepEqual(ARENA_MARKERS, [
    { id: 'A', kind: 'letter', x: 2, y: 1 },
    { id: 'B', kind: 'letter', x: 3, y: 2 },
    { id: 'C', kind: 'letter', x: 2, y: 3 },
    { id: 'D', kind: 'letter', x: 1, y: 2 },
    { id: '1', kind: 'number', x: 3.5, y: 0.5 },
    { id: '2', kind: 'number', x: 3.5, y: 3.5 },
    { id: '3', kind: 'number', x: 0.5, y: 3.5 },
    { id: '4', kind: 'number', x: 0.5, y: 0.5 }
  ]);
});
