import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LALARU_BOSS_POSITION,
  LALARU_PLAYER_RADIUS,
  attackSectorPath,
  clampLalaRuPlayerPosition,
  isPointInSafeSector,
  safeBoundaryLines,
  safeSectorPath
} from '../../src/mechanics/lalaru/geometry.ts';

test('east safe sector accepts east and rejects the other cardinal positions', () => {
  assert.equal(isPointInSafeSector({ x: 4.4, y: 2.5 }, 'east'), true);
  assert.equal(isPointInSafeSector({ x: .6, y: 2.5 }, 'east'), false);
  assert.equal(isPointInSafeSector({ x: 2.5, y: .6 }, 'east'), false);
  assert.equal(isPointInSafeSector({ x: 2.5, y: 4.4 }, 'east'), false);
});

test('safe sector includes its 45 degree boundary and excludes the boss center', () => {
  assert.equal(isPointInSafeSector({ x: 3.5, y: 3.5 }, 'east'), true);
  assert.equal(isPointInSafeSector(LALARU_BOSS_POSITION, 'east'), false);
});

test('player is clamped fully inside the 5 by 5 arena', () => {
  assert.deepEqual(clampLalaRuPlayerPosition({ x: -5, y: 9 }), {
    x: LALARU_PLAYER_RADIUS,
    y: 5 - LALARU_PLAYER_RADIUS
  });
});

test('visual attack and safe wedges are both derived from the same cardinal direction', () => {
  const eastAttack = attackSectorPath('east');
  const eastSafe = safeSectorPath('east');
  const westAttack = attackSectorPath('west');
  assert.notEqual(eastAttack, westAttack);
  assert.match(eastAttack, /^M 50 50 L /);
  assert.match(eastSafe, /^M 50 50 L /);
  assert.equal(safeBoundaryLines('east').length, 2);
});
