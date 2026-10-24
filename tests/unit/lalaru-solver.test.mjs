import test from 'node:test';
import assert from 'node:assert/strict';
import {
  finalSafeDirection,
  selectSide,
  solveQuestion
} from '../../src/mechanics/lalaru/solver.ts';
import { generateLalaRuQuestion } from '../../src/mechanics/lalaru/generation.ts';
import { dotCountdownSchedule } from '../../src/mechanics/lalaru/timing.ts';
import {
  countdownDotLayout,
  rightAngleMarkerPosition,
  ringRotationDegrees,
  ringTurnDirectionForArrowSide,
  triangleDestinationSide
} from '../../src/presentation/lalaru/rotation-cue.ts';

const ALL_DIRECTION_CASES = [
  ['north', 'left', 'III', 'right', 'west'],
  ['east', 'left', 'III', 'right', 'north'],
  ['south', 'left', 'III', 'right', 'east'],
  ['west', 'left', 'III', 'right', 'south'],
  ['north', 'left', 'V', 'left', 'east'],
  ['east', 'left', 'V', 'left', 'south'],
  ['south', 'left', 'V', 'left', 'west'],
  ['west', 'left', 'V', 'left', 'north'],
  ['north', 'right', 'III', 'left', 'east'],
  ['east', 'right', 'III', 'left', 'south'],
  ['south', 'right', 'III', 'left', 'west'],
  ['west', 'right', 'III', 'left', 'north'],
  ['north', 'right', 'V', 'right', 'west'],
  ['east', 'right', 'V', 'right', 'north'],
  ['south', 'right', 'V', 'right', 'east'],
  ['west', 'right', 'V', 'right', 'south']
];

for (const [initialSafeDirection, arrowSide, multiplier, selectedSide, expectedFinal] of ALL_DIRECTION_CASES) {
  test(`${initialSafeDirection} + arrow ${arrowSide} + ${multiplier} selects ${selectedSide} and resolves ${expectedFinal}`, () => {
    assert.deepEqual(solveQuestion({
      initialSafeDirection,
      arrowSide,
      multiplier,
      dotPattern: 5
    }), {
      selectedSide,
      finalSafeDirection: expectedFinal
    });
  });
}

test('III selects the opposite arrow side and V selects the arrow side', () => {
  assert.equal(selectSide('left', 'III'), 'right');
  assert.equal(selectSide('right', 'III'), 'left');
  assert.equal(selectSide('left', 'V'), 'left');
  assert.equal(selectSide('right', 'V'), 'right');
});

test('solution direction is relative to every initial safe direction', () => {
  assert.deepEqual({
    north: {
      left: finalSafeDirection('north', 'left'),
      right: finalSafeDirection('north', 'right')
    },
    east: {
      left: finalSafeDirection('east', 'left'),
      right: finalSafeDirection('east', 'right')
    },
    south: {
      left: finalSafeDirection('south', 'left'),
      right: finalSafeDirection('south', 'right')
    },
    west: {
      left: finalSafeDirection('west', 'left'),
      right: finalSafeDirection('west', 'right')
    }
  }, {
    north: { left: 'east', right: 'west' },
    east: { left: 'south', right: 'north' },
    south: { left: 'west', right: 'east' },
    west: { left: 'north', right: 'south' }
  });
});

test('arrow side derives a separate and explicit ring animation direction', () => {
  assert.equal(ringTurnDirectionForArrowSide('left'), 'clockwise');
  assert.equal(ringTurnDirectionForArrowSide('right'), 'counterclockwise');
  assert.equal(ringRotationDegrees('clockwise'), 90);
  assert.equal(ringRotationDegrees('counterclockwise'), -90);
});

test('triangle destination is derived separately from the visible arrow side', () => {
  assert.equal(triangleDestinationSide('left'), 'right');
  assert.equal(triangleDestinationSide('right'), 'left');
});

test('right-angle marker snaps between north and the triangle destination on each dot change', () => {
  assert.deepEqual(
    [5, 4, 3, 2, 1].map(count => rightAngleMarkerPosition('left', count)),
    ['top', 'right', 'top', 'right', 'top']
  );
  assert.deepEqual(
    [5, 4, 3, 2, 1].map(count => rightAngleMarkerPosition('right', count)),
    ['top', 'left', 'top', 'left', 'top']
  );
});

test('countdown dots stay on diagonal lines and center without transitional positions', () => {
  assert.deepEqual(countdownDotLayout(5), [
    [34, 34], [66, 34], [50, 50], [34, 66], [66, 66]
  ]);
  assert.deepEqual(countdownDotLayout(4), [
    [34, 34], [66, 34], [34, 66], [66, 66]
  ]);
  assert.deepEqual(countdownDotLayout(3), [[34, 34], [50, 50], [66, 66]]);
  assert.deepEqual(countdownDotLayout(2), [[34, 34], [66, 66]]);
  assert.deepEqual(countdownDotLayout(1), [[50, 50]]);
});

test('five-dot countdown changes once per second', () => {
  assert.deepEqual(dotCountdownSchedule(5), [
    { atMs: 1_000, count: 4 },
    { atMs: 2_000, count: 3 },
    { atMs: 3_000, count: 2 },
    { atMs: 4_000, count: 1 }
  ]);
});

test('white-dot countdown always starts at five independently from III/V', () => {
  const firstValues = [0.1, 0.1, 0.1];
  const secondValues = [0.9, 0.9, 0.9];
  const first = generateLalaRuQuestion(() => firstValues.shift());
  const second = generateLalaRuQuestion(() => secondValues.shift());
  assert.equal(first.initialSafeDirection, 'north');
  assert.equal(second.initialSafeDirection, 'west');
  assert.equal(first.arrowSide, 'left');
  assert.equal(second.arrowSide, 'right');
  assert.equal(first.multiplier, 'III');
  assert.equal(second.multiplier, 'V');
  assert.equal(first.dotPattern, 5);
  assert.equal(second.dotPattern, 5);
});

test('question generation can select every initial cardinal direction', () => {
  const directionRolls = [0, 0.25, 0.5, 0.75];
  const generatedDirections = directionRolls.map(directionRoll => {
    const values = [directionRoll, 0, 0];
    return generateLalaRuQuestion(() => values.shift()).initialSafeDirection;
  });

  assert.deepEqual(generatedDirections, ['north', 'east', 'south', 'west']);
});
