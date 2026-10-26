import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateQuestion,
  legalInitialCrystalLayouts
} from '../../src/mechanics/ketuduke/generation.ts';
import {
  crystalMotionPlan,
  hazardCells,
  validateCrystalGeometry
} from '../../src/mechanics/ketuduke/crystals.ts';
import { referenceSafeZones } from '../../src/mechanics/ketuduke/safe-zones.ts';

function unsafeCellsFor(center) {
  const safe = referenceSafeZones(center);
  return [...Array(16).keys()].filter(cell => !safe.has(cell));
}

function assertValidLayout(center, crystals) {
  const centerQuadrant = (center.r < 2 ? 0 : 2) + (center.c < 2 ? 0 : 1);
  const rotation = ((centerQuadrant === 0 || centerQuadrant === 3) === (center.o === 'h'))
    ? 'cw'
    : 'ccw';
  const question = {
    center,
    crystals,
    buffs: { T: 'bubble', H: 'bubble', D1: 'bind', D2: 'bind' },
    party: '分散',
    rotation
  };
  const plan = crystalMotionPlan(question);

  assert.ok(plan);
  assert.equal(
    new Set(plan.middle.map(crystal => `${crystal.r},${crystal.c}`)).size,
    4,
    'crystals must not overlap at the first-round endpoint'
  );
  assert.equal(validateCrystalGeometry(question, plan.target).ok, true);
  assert.deepEqual(
    [...hazardCells(plan.target)].sort((a, b) => a - b),
    unsafeCellsFor(center)
  );
}

test('all eight center configurations retain legal initial crystal layouts', async t => {
  for (const r of [1, 2]) {
    for (const c of [1, 2]) {
      for (const o of ['h', 'v']) {
        await t.test(`center=(${r},${c}), orientation=${o}`, () => {
          const center = { r, c, o };
          const layouts = legalInitialCrystalLayouts(center);

          assert.ok(layouts.length > 0, 'the configuration must not be silently removed');
          for (const crystals of layouts) assertValidLayout(center, crystals);
        });
      }
    }
  }
});

test('ten thousand generated questions all resolve to their golden safe zones', () => {
  let state = 0x4b1d;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const seen = new Set();

  for (let index = 0; index < 10_000; index++) {
    const question = generateQuestion(random);
    const key = `${question.center.r},${question.center.c},${question.center.o}`;
    seen.add(key);
    assertValidLayout(question.center, question.crystals);
  }

  assert.equal(seen.size, 8, 'random generation must continue to cover every center configuration');
});
