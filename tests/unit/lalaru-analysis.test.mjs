import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analysisGapCenterAngle,
  analysisRotationOffsetDegrees,
  attackSourceAngle,
  isAttackInAnalysisGap
} from '../../src/mechanics/lalaru/analysis.ts';
import { analysisRingPath } from '../../src/presentation/lalaru/analysis-cue.ts';

const player = { x: 2.5, y: 2.5 };
const sources = {
  front: { x: 2.5, y: .5 },
  right: { x: 4.5, y: 2.5 },
  back: { x: 2.5, y: 4.5 },
  left: { x: .5, y: 2.5 }
};

test('all four analysis debuffs accept an attack from their character-relative gap', () => {
  for (const debuff of ['front', 'back', 'left', 'right']) {
    assert.equal(isAttackInAnalysisGap(player, 0, debuff, sources[debuff]), true, debuff);
  }
});

test('all four analysis debuffs reject an attack from the blocked opposite side', () => {
  const opposite = { front: 'back', back: 'front', left: 'right', right: 'left' };
  for (const debuff of ['front', 'back', 'left', 'right']) {
    assert.equal(isAttackInAnalysisGap(player, 0, debuff, sources[opposite[debuff]]), false, debuff);
  }
});

test('gap direction follows world-facing angle rather than fixed screen directions', () => {
  assert.equal(analysisGapCenterAngle(90, 'front'), 90);
  assert.equal(analysisGapCenterAngle(90, 'left'), 0);
  assert.equal(isAttackInAnalysisGap(player, 90, 'front', sources.right), true);
  assert.equal(isAttackInAnalysisGap(player, 90, 'front', sources.front), false);
});

test('the provisional gap includes its plus or minus 45 degree boundaries', () => {
  assert.equal(isAttackInAnalysisGap(player, 0, 'front', { x: 4.5, y: .5 }), true);
  assert.equal(isAttackInAnalysisGap(player, 0, 'front', { x: .5, y: .5 }), true);
  assert.equal(isAttackInAnalysisGap(player, 0, 'front', { x: 4.5, y: 2.5 }), false);
});

test('attack source is measured from the player toward the orb', () => {
  assert.equal(attackSourceAngle(player, sources.front), 0);
  assert.equal(attackSourceAngle(player, sources.right), 90);
  assert.equal(attackSourceAngle(player, sources.back), 180);
  assert.equal(attackSourceAngle(player, sources.left), 270);
  assert.equal(attackSourceAngle(player, player), null);
});

test('C-ring path rotates with facing and debuff without changing its gap size', () => {
  const frontNorth = analysisRingPath(0, 'front');
  const frontEast = analysisRingPath(90, 'front');
  const rightNorth = analysisRingPath(0, 'right');
  assert.notEqual(frontNorth, frontEast);
  assert.equal(frontEast, rightNorth);
  assert.match(frontNorth, /^M .+ A 40 40 0 1 1 /);
});

test('player III/V multiplication converts the selected side into a separate 90 degree gap offset', () => {
  assert.equal(analysisRotationOffsetDegrees('left', 'III'), 90);
  assert.equal(analysisRotationOffsetDegrees('left', 'V'), -90);
  assert.equal(analysisRotationOffsetDegrees('right', 'III'), -90);
  assert.equal(analysisRotationOffsetDegrees('right', 'V'), 90);
});

test('an additional multiplication offset rotates the analysis gap without changing character facing', () => {
  const facingAngle = 25;
  assert.equal(analysisGapCenterAngle(facingAngle, 'front', 90), 115);
  assert.equal(facingAngle, 25);
  assert.equal(isAttackInAnalysisGap(player, 0, 'front', sources.right, 45, 90), true);
  assert.equal(isAttackInAnalysisGap(player, 0, 'front', sources.front, 45, 90), false);
});
