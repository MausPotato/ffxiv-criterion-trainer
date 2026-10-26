import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPATIAL_PARTY_IDS,
  createSpatialBombPattern,
  movementSegmentTouchesDanger,
  rotateCellClockwise,
  shuffleSpatialLayers,
  spatialDamageSourcesAtStep,
  spatialSourceHitsPoint
} from '../../src/mechanics/lalaru/index.ts';

test('spatial party always receives one each of subtraction beta 1, 2, 3, and 4', () => {
  for (const values of [[0, 0, 0], [.99, .99, .99], [.2, .8, .4], [.7, .1, .6]]) {
    const queue = [...values];
    const layers = shuffleSpatialLayers(() => queue.shift() ?? 0);
    assert.deepEqual([...layers].sort(), [1, 2, 3, 4]);
    assert.equal(layers.length, SPATIAL_PARTY_IDS.length);
  }
});

test('fixed pattern contains the specified white orb and six bombs', () => {
  const pattern = createSpatialBombPattern(0);
  assert.deepEqual(pattern.whiteOrb.cell, { row: 1, col: 4 });
  assert.deepEqual(pattern.bombs.map(bomb => [bomb.step, bomb.cell]), [
    [6, { row: 3, col: 3 }],
    [9, { row: 0, col: 3 }],
    [1, { row: 3, col: 0 }],
    [3, { row: 1, col: 0 }],
    [7, { row: 2, col: 1 }],
    [9, { row: 4, col: 1 }]
  ]);
});

test('rotation keeps every route event and bomb in the same relative cell', () => {
  const base = createSpatialBombPattern(0);
  for (const turns of [1, 2, 3]) {
    const rotated = createSpatialBombPattern(turns);
    for (const routeId of ['route-a', 'route-b']) {
      for (let index = 0; index < 9; index += 1) {
        let expected = base.routes[routeId][index].cell;
        for (let turn = 0; turn < turns; turn += 1) expected = rotateCellClockwise(expected);
        assert.deepEqual(rotated.routes[routeId][index].cell, expected);
        assert.equal(rotated.routes[routeId][index].event, base.routes[routeId][index].event);
      }
    }
  }
});

test('every fixture keeps cubes on orb-route steps 6/9 and non-orb steps 1/3/7/9', () => {
  for (const rotation of [0, 1, 2, 3]) {
    const pattern = createSpatialBombPattern(rotation);
    assert.equal(pattern.whiteOrb.routeId, 'route-a');
    assert.equal(pattern.whiteOrb.step, 1);
    assert.deepEqual(
      pattern.bombs.filter(bomb => bomb.routeId === 'route-a').map(bomb => bomb.step),
      [6, 9]
    );
    assert.deepEqual(
      pattern.bombs.filter(bomb => bomb.routeId === 'route-b').map(bomb => bomb.step),
      [1, 3, 7, 9]
    );
  }
});

test('step one and step nine retain independent simultaneous damage sources', () => {
  const pattern = createSpatialBombPattern(0);
  assert.deepEqual(spatialDamageSourcesAtStep(pattern, 1).map(source => source.kind), ['white-orb', 'cross-bomb']);
  const finalSources = spatialDamageSourcesAtStep(pattern, 9);
  assert.equal(finalSources.length, 2);
  assert.notEqual(finalSources[0].id, finalSources[1].id);
  assert.ok(finalSources.every(source => source.kind === 'cross-bomb'));
});

test('cross damage uses the bomb row or column and two bombs can both hit', () => {
  const pattern = createSpatialBombPattern(0);
  const stepThree = spatialDamageSourcesAtStep(pattern, 3)[0];
  assert.equal(spatialSourceHitsPoint(stepThree, { x: 2.5, y: 1.5 }), true);
  assert.equal(spatialSourceHitsPoint(stepThree, { x: 2.5, y: 2.5 }), false);

  const stepNine = spatialDamageSourcesAtStep(pattern, 9);
  const doubleHitPoint = { x: 1.5, y: .5 };
  assert.equal(stepNine.filter(source => spatialSourceHitsPoint(source, doubleHitPoint)).length, 2);
});

test('movement collision checks the complete segment instead of only its endpoint', () => {
  const dangerous = [{ row: 2, col: 2 }];
  assert.equal(movementSegmentTouchesDanger({ x: 1.2, y: 2.5 }, { x: 3.8, y: 2.5 }, dangerous), true);
  assert.equal(movementSegmentTouchesDanger({ x: 1.2, y: 1.2 }, { x: 3.8, y: 1.2 }, dangerous), false);
});
