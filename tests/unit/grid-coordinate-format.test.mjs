import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCellCoordinate,
  formatGridCoordinate
} from '../../src/domain/grid-coordinate-format.ts';

test('formats zero-based coordinates as one-based column then row labels', () => {
  assert.equal(formatGridCoordinate({ c: 2, r: 1 }), '第 3 直行、第 2 橫列');
  assert.equal(formatGridCoordinate({ c: 0, r: 0 }), '第 1 直行、第 1 橫列');
  assert.equal(formatGridCoordinate({ c: 3, r: 3 }), '第 4 直行、第 4 橫列');
});

test('formats a cell index through the shared coordinate formatter', () => {
  assert.equal(formatCellCoordinate(6), '第 3 直行、第 2 橫列');
});
