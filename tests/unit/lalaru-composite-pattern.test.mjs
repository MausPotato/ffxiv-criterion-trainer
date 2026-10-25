import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cellKey,
  createCompositePattern,
  dangerousCellsThroughStep,
  finalSafeCells,
  isPointInDangerousCells,
  rotateCellClockwise
} from '../../src/mechanics/lalaru/composite-pattern.ts';
import { cameraPointToWorldPoint, worldPointToCameraPoint } from '../../src/presentation/lalaru/camera.ts';

const cells = route => route.map(cell => [cell.row, cell.col]);

test('north-south pattern traces both adjustable marker routes on the 5 by 5 grid', () => {
  const pattern = createCompositePattern('north-south');
  assert.deepEqual(cells(pattern.routes[0]), [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1]
  ]);
  assert.deepEqual(cells(pattern.routes[1]), [
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4],
    [4, 3], [3, 3], [2, 3], [1, 3], [0, 3]
  ]);
  assert.ok(pattern.routes.flat().every(cell => cell.row >= 0 && cell.row < 5 && cell.col >= 0 && cell.col < 5));
});

test('east-west pattern rotates starts, turns, orbs, and every route cell together', () => {
  const northSouth = createCompositePattern('north-south');
  const eastWest = createCompositePattern('east-west');
  assert.deepEqual(
    eastWest.routes.map(cells),
    northSouth.routes.map(route => cells(route.map(rotateCellClockwise)))
  );
  assert.deepEqual(
    eastWest.orbs.map(orb => orb.cell),
    northSouth.orbs.map(orb => rotateCellClockwise(orb.cell))
  );
  assert.deepEqual(eastWest.starts.map(marker => marker.cell), northSouth.starts.map(marker => rotateCellClockwise(marker.cell)));
  assert.deepEqual(eastWest.turns.map(marker => marker.cell), northSouth.turns.map(marker => rotateCellClockwise(marker.cell)));
});

test('mirrored pattern reverses every start, turn, orb, and route before orientation rotation', () => {
  const primary = createCompositePattern('north-south', 'upper-first', 'primary');
  const mirrored = createCompositePattern('north-south', 'upper-first', 'mirrored');
  assert.deepEqual(cells(mirrored.routes[0]), [
    [4, 4], [3, 4], [2, 4], [1, 4], [0, 4],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3]
  ]);
  assert.deepEqual(cells(mirrored.routes[1]), [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    [4, 1], [3, 1], [2, 1], [1, 1], [0, 1]
  ]);
  assert.deepEqual(mirrored.starts, [
    { cell: { row: 4, col: 4 }, direction: 'up' },
    { cell: { row: 0, col: 0 }, direction: 'down' }
  ]);
  assert.deepEqual(mirrored.orbs.map(orb => orb.cell), [
    { row: 1, col: 0 }, { row: 4, col: 3 }
  ]);
  assert.deepEqual(
    createCompositePattern('east-west', 'upper-first', 'mirrored').routes.map(cells),
    mirrored.routes.map(route => cells(route.map(rotateCellClockwise)))
  );
  assert.notDeepEqual(mirrored.routes, primary.routes);
});

test('orb placement supports either the upper or lower route triggering first', () => {
  const upperFirst = createCompositePattern('north-south', 'upper-first');
  const lowerFirst = createCompositePattern('north-south', 'lower-first');
  assert.deepEqual(upperFirst.orbs.map(orb => orb.cell), [
    { row: 1, col: 4 },
    { row: 4, col: 1 }
  ]);
  assert.deepEqual(lowerFirst.orbs.map(orb => orb.cell), [
    { row: 3, col: 0 },
    { row: 0, col: 3 }
  ]);
  assert.deepEqual(lowerFirst.routes[0][1], lowerFirst.orbs[0].cell);
  assert.deepEqual(lowerFirst.routes[1][9], lowerFirst.orbs[1].cell);
});

test('orbs occupy route cell 2 and route cell 10, using zero-based path indexes 1 and 9', () => {
  for (const orientation of ['north-south', 'east-west']) {
    for (const orbOrder of ['upper-first', 'lower-first']) {
      const pattern = createCompositePattern(orientation, orbOrder);
      assert.deepEqual(pattern.routes[orbOrder === 'upper-first' ? 1 : 0][1], pattern.orbs[0].cell);
      assert.deepEqual(pattern.routes[orbOrder === 'upper-first' ? 0 : 1][9], pattern.orbs[1].cell);
    }
  }
});

test('completed patterns leave only the center column or center row safe', () => {
  assert.deepEqual(cells(finalSafeCells(createCompositePattern('north-south'))), [
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]
  ]);
  assert.deepEqual(cells(finalSafeCells(createCompositePattern('east-west'))), [
    [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]
  ]);
  assert.deepEqual(cells(finalSafeCells(createCompositePattern('north-south', 'upper-first', 'mirrored'))), [
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]
  ]);
  assert.deepEqual(cells(finalSafeCells(createCompositePattern('east-west', 'upper-first', 'mirrored'))), [
    [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]
  ]);
});

test('walked cells stay dangerous and use world-space collision after camera round trips', () => {
  const pattern = createCompositePattern('north-south');
  const early = dangerousCellsThroughStep(pattern, 2);
  const late = dangerousCellsThroughStep(pattern, 8);
  assert.ok(early.every(cell => new Set(late.map(cellKey)).has(cellKey(cell))));

  const worldDanger = { x: 0.5, y: 2.5 };
  const cameraPoint = worldPointToCameraPoint(worldDanger, 47);
  const recoveredWorld = cameraPointToWorldPoint(cameraPoint, 47);
  assert.equal(isPointInDangerousCells(recoveredWorld, late), true);
  assert.equal(isPointInDangerousCells({ x: 2.5, y: 2.5 }, late), false);
});
