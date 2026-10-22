import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES } from '../../src/domain/roles.ts';
import {
  autoQueue,
  candidatePrePositions,
  canonicalCrystalFinal,
  crystalMotionPlan,
  generateQuestion,
  groupCheck,
  hazardCells,
  mahjongRegion,
  prePositionError,
  pushAt,
  queueError,
  solveParty,
  validateCrystalGeometry,
  wantedMahjongRegion
} from '../../src/mechanics/ketuduke/index.ts';
import { createLegacyHarness } from '../helpers/legacy-harness.mjs';

const RANDOM_SEQUENCES = [
  [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.05, 0.15],
  [0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.95, 0.85],
  [0.15, 0.85, 0.65, 0.05, 0.95, 0.35, 0.75, 0.25],
  [0.85, 0.15, 0.35, 0.95, 0.05, 0.75, 0.25, 0.65]
];

function repeatingRandom(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

function plain(value) {
  return value === null || value === undefined
    ? value
    : JSON.parse(JSON.stringify(value));
}

function generatedPair(values) {
  const harness = createLegacyHarness({ randomValues: values });
  const legacy = plain(harness.api.make());
  const extracted = generateQuestion(repeatingRandom(values));
  return { harness, legacy, extracted };
}

test('question generation matches V4.5 for deterministic random sequences', async t => {
  for (const [index, values] of RANDOM_SEQUENCES.entries()) {
    await t.test(`sequence ${index + 1}`, () => {
      const { legacy, extracted } = generatedPair(values);
      assert.deepEqual(extracted, legacy);
    });
  }
});

test('queue, mahjong regions, and pre-position candidates match V4.5', async t => {
  for (const [index, values] of RANDOM_SEQUENCES.entries()) {
    await t.test(`question ${index + 1}`, () => {
      const { harness, legacy, extracted } = generatedPair(values);
      harness.api.setGame(legacy);
      assert.deepEqual(autoQueue(extracted), plain(harness.api.autoQueue()));

      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          assert.equal(mahjongRegion(extracted, r, c), harness.api.mah(r, c));
        }
      }
      for (const role of ROLES) {
        assert.equal(wantedMahjongRegion(extracted, role), harness.api.wanted(role));
        assert.deepEqual(candidatePrePositions(extracted, role), plain(harness.api.candidatePre(role)));

        for (const selected of [undefined, 0, autoQueue(extracted)[role]]) {
          harness.api.setFocus(role);
          harness.api.setQueue(selected === undefined ? {} : { [role]: selected });
          assert.equal(
            queueError(extracted, role, selected) === null,
            harness.api.queueError() === null,
            'display wording may differ, but queue validity must remain compatible'
          );
        }
      }
    });
  }
});

test('wind displacement matches V4.5 for every cell, step, and rotation', () => {
  const harness = createLegacyHarness();
  for (const rotation of ['cw', 'ccw']) {
    harness.api.setGame({ ...harness.api.getGame(), rotation });
    for (let cell = 0; cell < 16; cell++) {
      for (const step of [1, 2]) {
        assert.equal(pushAt(cell, step, rotation), harness.api.pushAt(cell, step));
      }
    }
  }
});

test('canonical crystal geometry and hazards match V4.5', async t => {
  for (const [index, values] of RANDOM_SEQUENCES.entries()) {
    await t.test(`question ${index + 1}`, () => {
      const { harness, legacy, extracted } = generatedPair(values);
      harness.api.setGame(legacy);
      const legacyFinal = plain(harness.api.canonicalCrystalFinal());
      const extractedFinal = canonicalCrystalFinal(extracted);
      assert.deepEqual(extractedFinal, legacyFinal);
      assert.ok(extractedFinal);

      harness.api.setCrystalFinal(legacyFinal);
      const extractedHazards = [...hazardCells(extractedFinal)].sort((a, b) => a - b);
      assert.deepEqual(extractedHazards, [...harness.api.hazards()].sort((a, b) => a - b));
      assert.deepEqual(
        validateCrystalGeometry(extracted, extractedFinal),
        plain(harness.api.validateCrystalGeometry())
      );
      harness.api.setCrystalFinal(legacy.crystals.map(crystal => ({ ...crystal })));
      assert.deepEqual(crystalMotionPlan(extracted), plain(harness.api.crystalMotionPlan()));
    });
  }
});

test('full-party solver matches V4.5 for every focus role', async t => {
  for (const [questionIndex, values] of RANDOM_SEQUENCES.entries()) {
    const { harness, legacy, extracted } = generatedPair(values);
    harness.api.setGame(legacy);
    for (const role of ROLES) {
      await t.test(`question ${questionIndex + 1}, focus ${role}`, () => {
        harness.api.setFocus(role);
        const legacySolution = plain(harness.api.solveParty());
        const extractedSolution = solveParty(extracted, role);
        assert.deepEqual(extractedSolution, legacySolution);
        if (legacySolution) {
          const playerSpot = legacySolution.pre[role];
          harness.api.setQueue(plain(harness.api.autoQueue()));
          harness.api.setPre({ [role]: playerSpot });
          assert.deepEqual(
            prePositionError(extracted, role, playerSpot),
            plain(harness.api.preError())
          );
          assert.deepEqual(
            solveParty(extracted, role, playerSpot),
            plain(harness.api.solveParty(playerSpot))
          );
          harness.api.setPlayerFinal(legacySolution.final);
          assert.deepEqual(groupCheck(extracted, extractedSolution.final), plain(harness.api.groupCheck()));
        }
      });
    }
  }
});
