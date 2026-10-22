import test from 'node:test';
import assert from 'node:assert/strict';
import { hazardCells, validateCrystalGeometry } from '../../src/mechanics/ketuduke/crystals.ts';
import { referenceSafeZones } from '../../src/mechanics/ketuduke/safe-zones.ts';
import { crystalMotionPlan, canonicalCrystalFinal } from '../../src/mechanics/ketuduke/crystals.ts';
import { simulateCrystalWindStep } from '../../src/mechanics/ketuduke/wind.ts';

const CASES = [
  {
    center: [1, 1, 'h'], rotation: 'cw',
    initial: ['1,1,h', '0,3,v', '3,0,v', '3,3,h'],
    middle: ['1,3,h', '0,3,v', '3,0,v', '3,1,h'],
    final: ['1,3,h', '2,3,v', '1,0,v', '3,1,h']
  },
  {
    center: [1, 1, 'v'], rotation: 'ccw',
    initial: ['1,1,v', '0,3,h', '3,0,h', '3,3,v'],
    middle: ['1,1,v', '0,1,h', '3,2,h', '3,3,v'],
    final: ['3,1,v', '0,1,h', '3,2,h', '1,3,v']
  },
  {
    center: [1, 2, 'h'], rotation: 'ccw',
    initial: ['0,0,v', '1,2,h', '3,0,h', '3,3,v'],
    middle: ['0,0,v', '1,0,h', '3,2,h', '3,3,v'],
    final: ['2,0,v', '1,0,h', '3,2,h', '1,3,v']
  },
  {
    center: [1, 2, 'v'], rotation: 'cw',
    initial: ['0,0,h', '1,2,v', '3,0,v', '3,3,h'],
    middle: ['0,2,h', '1,2,v', '3,0,v', '3,1,h'],
    final: ['0,2,h', '3,2,v', '1,0,v', '3,1,h']
  },
  {
    center: [2, 1, 'h'], rotation: 'ccw',
    initial: ['0,0,v', '0,3,h', '2,1,h', '3,3,v'],
    middle: ['0,0,v', '0,1,h', '2,3,h', '3,3,v'],
    final: ['2,0,v', '0,1,h', '2,3,h', '1,3,v']
  },
  {
    center: [2, 1, 'v'], rotation: 'cw',
    initial: ['0,0,h', '0,3,v', '2,1,v', '3,3,h'],
    middle: ['0,2,h', '0,3,v', '2,1,v', '3,1,h'],
    final: ['0,2,h', '2,3,v', '0,1,v', '3,1,h']
  },
  {
    center: [2, 2, 'h'], rotation: 'cw',
    initial: ['0,0,h', '0,3,v', '3,0,v', '2,2,h'],
    middle: ['0,2,h', '0,3,v', '3,0,v', '2,0,h'],
    final: ['0,2,h', '2,3,v', '1,0,v', '2,0,h']
  },
  {
    center: [2, 2, 'v'], rotation: 'ccw',
    initial: ['0,0,v', '0,3,h', '3,0,h', '2,2,v'],
    middle: ['0,0,v', '0,1,h', '3,2,h', '2,2,v'],
    final: ['2,0,v', '0,1,h', '3,2,h', '0,2,v']
  }
];

function crystals(values) {
  return values.map((value, q) => {
    const [r, c, o] = value.split(',');
    return { r: Number(r), c: Number(c), o, q };
  });
}

function positions(values) {
  return values.map(({ r, c, o }) => `${r},${c},${o}`);
}

function questionFor(entry) {
  const [r, c, o] = entry.center;
  return {
    center: { r, c, o },
    crystals: crystals(entry.initial),
    buffs: { MT: 'bubble', H: 'bubble', D1: 'bind', D2: 'bind' },
    party: '分散',
    rotation: entry.rotation
  };
}

test('all four crystals follow their mahjong wind round in all eight safe-zone configurations', async t => {
  for (const entry of CASES) {
    const [r, c, o] = entry.center;
    await t.test(`center=(${r},${c}), orientation=${o}`, () => {
      const question = questionFor(entry);
      const middle = simulateCrystalWindStep(question, question.crystals, 1);
      const final = simulateCrystalWindStep(question, middle, 2);
      const plan = crystalMotionPlan(question);

      assert.deepEqual(positions(question.crystals), entry.initial, 'initial crystal positions');
      assert.deepEqual(positions(middle), entry.middle, '① crystal endpoints');
      assert.deepEqual(positions(final), entry.final, '② crystal endpoints');
      assert.deepEqual(plan, { middle, target: final });

      const centerQuadrant = question.crystals.findIndex(
        crystal => crystal.r === r && crystal.c === c
      );
      assert.notEqual(centerQuadrant, -1);
      assert.notDeepEqual(final[centerQuadrant], question.crystals[centerQuadrant], 'initial center crystal moves');

      assert.equal(validateCrystalGeometry(question, final).ok, true);
      const actualSafe = [...Array(16).keys()].filter(cell => !hazardCells(final).has(cell));
      assert.deepEqual(actualSafe, [...referenceSafeZones(question.center)].sort((a, b) => a - b));
      assert.deepEqual(canonicalCrystalFinal(question), final);
    });
  }
});

test('an incompatible initial layout is reported instead of snapping to the golden safe-zone geometry', () => {
  const entry = CASES[0];
  const question = questionFor(entry);
  question.crystals[1] = { ...question.crystals[1], r: 1 };

  const plan = crystalMotionPlan(question);
  assert.ok(plan);
  assert.equal(validateCrystalGeometry(question, plan.target).ok, false);
  assert.equal(canonicalCrystalFinal(question), null);
  assert.deepEqual(
    plan.target,
    simulateCrystalWindStep(question, simulateCrystalWindStep(question, question.crystals, 1), 2),
    'the calculated endpoint is preserved without settlement correction'
  );
});
