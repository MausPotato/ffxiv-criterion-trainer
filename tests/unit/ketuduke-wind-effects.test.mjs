import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from '../../src/mechanics/ketuduke/generation.ts';
import {
  WIND_ACTOR_MOVE_DURATION_MS,
  WIND_ACTOR_START_DELAY_MS,
  WIND_HOLD_DURATION_MS,
  WIND_MOVE_DURATION_MS,
  WIND_REPLAY_DURATION_MS,
  WIND_ROUND_DURATION_MS,
  quadrantWindCues,
  windEffectsForStep
} from '../../src/presentation/ketuduke/wind-effects.ts';

function repeatingRandom(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

function questionForCenter(r, c, orientation) {
  return generateQuestion(repeatingRandom([
    r === 1 ? 0.1 : 0.6,
    c === 1 ? 0.1 : 0.6,
    orientation === 'h' ? 0.6 : 0.1,
    0.1, 0.2, 0.3, 0.4, 0.1, 0.1
  ]));
}

function expectedDirection(quadrant, step, rotation) {
  const clockwise = rotation === 'cw';
  if (step === 1) {
    const pointsRight = (quadrant < 2) === clockwise;
    return pointsRight ? 'right' : 'left';
  }
  const pointsUp = (quadrant % 2 === 0) === clockwise;
  return pointsUp ? 'up' : 'down';
}

test('wind playback centrally manages one-second movement and half-second hold per round', () => {
  assert.equal(WIND_MOVE_DURATION_MS, 1_000);
  assert.equal(WIND_HOLD_DURATION_MS, 500);
  assert.equal(WIND_ROUND_DURATION_MS, 1_500);
  assert.equal(WIND_REPLAY_DURATION_MS, 3_000);
  assert.equal(WIND_ACTOR_START_DELAY_MS, 0);
  assert.equal(WIND_ACTOR_MOVE_DURATION_MS, WIND_MOVE_DURATION_MS);
});

test('all eight center-crystal configurations derive two synchronized quadrant winds per round', async t => {
  for (const r of [1, 2]) {
    for (const c of [1, 2]) {
      for (const orientation of ['h', 'v']) {
        await t.test(`center=(${r},${c}), orientation=${orientation}`, () => {
          const question = questionForCenter(r, c, orientation);
          assert.deepEqual(question.center, { r, c, o: orientation });
          const cues = quadrantWindCues(question);

          assert.deepEqual(cues.map(cue => cue.quadrant), [0, 1, 2, 3]);
          assert.ok(cues.every(cue => {
            const crystal = question.crystals.find(candidate => candidate.q === cue.quadrant);
            const expectedRegion = crystal.o === 'h' ? 1 : 2;
            return cue.region === expectedRegion
              && cue.step === expectedRegion
              && cue.direction === expectedDirection(cue.quadrant, cue.step, question.rotation);
          }), 'horizontal crystals map to one blue dot and horizontal wind; vertical crystals map to two red dots and vertical wind');

          for (const step of [1, 2]) {
            const effects = windEffectsForStep(question, step);
            const expectedQuadrants = question.crystals
              .filter(crystal => crystal.o === (step === 1 ? 'h' : 'v'))
              .map(crystal => crystal.q)
              .sort((a, b) => a - b);

            assert.equal(effects.length, 2);
            assert.deepEqual(
              effects.map(effect => effect.quadrant).sort((a, b) => a - b),
              expectedQuadrants
            );
            assert.ok(effects.every(effect => effect.region === step && effect.step === step));
            assert.ok(effects.every(effect => effect.durationMs === WIND_ROUND_DURATION_MS));
            assert.deepEqual(
              effects.map(effect => effect.direction),
              effects.map(effect => expectedDirection(effect.quadrant, step, question.rotation))
            );
            assert.equal(new Set(effects.map(effect => effect.direction)).size, 2);
          }
        });
      }
    }
  }
});
