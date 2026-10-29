import test from 'node:test';
import assert from 'node:assert/strict';
import { useLalaRuSpatialBombsTrainer } from '../../src/composables/useLalaRuSpatialBombsTrainer.ts';
import {
  LALARU_BOSS_POSITION,
  SPATIAL_BOMBS_TIMING,
  spatialInitialPartyPosition,
  spatialStandardPartyPosition
} from '../../src/mechanics/lalaru/index.ts';

class FakeScheduler {
  time = 0;
  nextId = 1;
  tasks = new Map();
  setTimeout = (callback, delay) => {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.time + delay, callback });
    return id;
  };
  clearTimeout = id => { this.tasks.delete(id); };
  advanceTo(target) {
    while (true) {
      const next = [...this.tasks.entries()]
        .filter(([, task]) => task.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      const [id, task] = next;
      this.tasks.delete(id);
      this.time = task.at;
      task.callback();
    }
    this.time = target;
  }
  now = () => this.time;
}

const CANNON_NORTH = { initialSafeDirection: 'east', arrowSide: 'left', multiplier: 'III', dotPattern: 5 };

function question(playerLayer = 1) {
  const remaining = [1, 2, 3, 4].filter(layer => layer !== playerLayer);
  return {
    rotation: 0,
    party: [
      { id: 'you', initialLayer: playerLayer },
      { id: 'npc-a', initialLayer: remaining[0] },
      { id: 'npc-b', initialLayer: remaining[1] },
      { id: 'npc-c', initialLayer: remaining[2] }
    ],
    cannon: CANNON_NORTH
  };
}

function createTrainer(playerLayer = 1) {
  const scheduler = new FakeScheduler();
  const fixed = question(playerLayer);
  const trainer = useLalaRuSpatialBombsTrainer({
    scheduler,
    questionFactory: () => structuredClone(fixed)
  });
  return { scheduler, trainer };
}

const REVEAL_AT = SPATIAL_BOMBS_TIMING.revealDelayMs;
const STEP_ONE_AT = REVEAL_AT + SPATIAL_BOMBS_TIMING.previewDurationMs;
const stepAt = step => STEP_ONE_AT + (step - 1) * SPATIAL_BOMBS_TIMING.stepIntervalMs;

test('all actors begin in a small diamond inside the boss cell before NPCs take their assignments', () => {
  const { scheduler, trainer } = createTrainer(4);
  const initial = trainer.actorPositions.value;
  const positions = Object.values(initial);

  assert.equal(new Set(positions.map(position => `${position.x},${position.y}`)).size, 4);
  for (const [id, position] of Object.entries(initial)) {
    assert.deepEqual(position, spatialInitialPartyPosition(id));
    assert.equal(Math.floor(position.x), Math.floor(LALARU_BOSS_POSITION.x));
    assert.equal(Math.floor(position.y), Math.floor(LALARU_BOSS_POSITION.y));
  }

  trainer.start();
  scheduler.advanceTo(REVEAL_AT - 1);
  assert.deepEqual(trainer.actorPositions.value, initial);
  scheduler.advanceTo(REVEAL_AT);

  assert.deepEqual(trainer.actorPositions.value.you, initial.you, 'the player is never placed on the answer');
  for (const member of trainer.question.value.party.filter(member => member.id !== 'you')) {
    assert.deepEqual(
      trainer.actorPositions.value[member.id],
      spatialStandardPartyPosition(member.id, member.initialLayer, trainer.question.value.rotation)
    );
  }
});

test('the arena stays empty for the composite lead-in before the three-second preview', () => {
  const { scheduler, trainer } = createTrainer(1);
  trainer.start();
  assert.equal(trainer.phase.value, 'lead-in');
  assert.equal(trainer.currentStep.value, 0);

  scheduler.advanceTo(REVEAL_AT - 1);
  assert.equal(trainer.phase.value, 'lead-in');
  scheduler.advanceTo(REVEAL_AT);
  assert.equal(trainer.phase.value, 'preview');
  assert.equal(trainer.currentStep.value, 0);

  scheduler.advanceTo(STEP_ONE_AT - 1);
  assert.equal(trainer.phase.value, 'preview');
  scheduler.advanceTo(STEP_ONE_AT);
  assert.equal(trainer.phase.value, 'stepping');
  assert.equal(trainer.currentStep.value, 1);
});

test('default questions randomize all four route fixtures without coupling them to the camera', () => {
  const rotations = [.01, .26, .51, .76];
  let call = 0;
  let questionIndex = 0;
  const trainer = useLalaRuSpatialBombsTrainer({
    random: () => {
      const value = call % 7 === 3 ? rotations[questionIndex++] : .2;
      call += 1;
      return value;
    }
  });
  assert.equal(trainer.question.value.rotation, 0);
  trainer.nextQuestion();
  assert.equal(trainer.question.value.rotation, 1);
  trainer.nextQuestion();
  assert.equal(trainer.question.value.rotation, 2);
  trainer.nextQuestion();
  assert.equal(trainer.question.value.rotation, 3);
});

test('the standard movement timeline clears all four beta stacks', () => {
  const { scheduler, trainer } = createTrainer(1);
  trainer.start();
  scheduler.advanceTo(stepAt(1));
  assert.deepEqual(trainer.remainingLayers.value, { you: 0, 'npc-a': 1, 'npc-b': 1, 'npc-c': 2 });
  scheduler.advanceTo(stepAt(3));
  trainer.setPlayerPosition({ x: 2.5, y: 1.5 });
  assert.deepEqual(trainer.remainingLayers.value, { you: 0, 'npc-a': 1, 'npc-b': 1, 'npc-c': 2 });
  scheduler.advanceTo(stepAt(6));
  assert.deepEqual(trainer.remainingLayers.value, { you: 0, 'npc-a': 1, 'npc-b': 0, 'npc-c': 1 });
  scheduler.advanceTo(stepAt(7));
  assert.deepEqual(trainer.remainingLayers.value, { you: 0, 'npc-a': 0, 'npc-b': 0, 'npc-c': 1 });
  scheduler.advanceTo(stepAt(9));
  assert.deepEqual(trainer.remainingLayers.value, { you: 0, 'npc-a': 0, 'npc-b': 0, 'npc-c': 0 });
  assert.equal(trainer.phase.value, 'stepping', 'bomb completion does not settle the whole question');
});

test('layer one moving north before step three dies to that cross', () => {
  const { scheduler, trainer } = createTrainer(1);
  trainer.start();
  scheduler.advanceTo(stepAt(2));
  trainer.setPlayerPosition({ x: 2.5, y: 1.5 });
  scheduler.advanceTo(stepAt(3));
  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.code, 'overhit');
  assert.match(trainer.deathRecord.value.sourceId, /bomb-3/);
});

test('layer one remaining in the center dies to the step seven cross', () => {
  const { scheduler, trainer } = createTrainer(1);
  trainer.start();
  scheduler.advanceTo(stepAt(7));
  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.code, 'overhit');
  assert.match(trainer.deathRecord.value.sourceId, /bomb-7/);
});

test('layer four that takes the initial south position but skips the final move expires with one stack', () => {
  const { scheduler, trainer } = createTrainer(4);
  trainer.start();
  scheduler.advanceTo(REVEAL_AT);
  trainer.setPlayerPosition({ x: 2.5, y: 3.5 });
  scheduler.advanceTo(stepAt(9));
  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.code, 'debuff-expired');
  assert.equal(trainer.deathRecord.value.remainingLayers, 1);
});

test('crossing an already stepped cell records the path collision immediately', () => {
  const { scheduler, trainer } = createTrainer(1);
  trainer.start();
  scheduler.advanceTo(stepAt(1));
  trainer.setPlayerPosition({ x: 4.5, y: 1.5 });
  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.code, 'danger-floor');
});

test('rotation cue runs for five seconds and cannon resolves from the live position', () => {
  const { scheduler, trainer } = createTrainer(1);
  trainer.start();
  scheduler.advanceTo(stepAt(3));
  trainer.setPlayerPosition({ x: 2.5, y: 1.5 });
  scheduler.advanceTo(stepAt(9) + SPATIAL_BOMBS_TIMING.cannonAfterFinalBombDelayMs);
  assert.equal(trainer.phase.value, 'cannon-countdown');
  assert.equal(trainer.cannonSeconds.value, 5);
  scheduler.advanceTo(stepAt(9) + SPATIAL_BOMBS_TIMING.cannonAfterFinalBombDelayMs + 4_000);
  assert.equal(trainer.cannonSeconds.value, 1);
  assert.equal(trainer.succeeded.value, null);
  scheduler.advanceTo(stepAt(9) + SPATIAL_BOMBS_TIMING.cannonAfterFinalBombDelayMs + 5_000);
  assert.equal(trainer.phase.value, 'cannon-impact');
  scheduler.advanceTo(stepAt(9) + SPATIAL_BOMBS_TIMING.cannonAfterFinalBombDelayMs + 5_000 + SPATIAL_BOMBS_TIMING.cannonImpactMs);
  assert.equal(trainer.phase.value, 'resolved');
  assert.equal(trainer.succeeded.value, true);
});

test('magic cannon independently kills a player outside its final safe sector', () => {
  const { scheduler, trainer } = createTrainer(2);
  trainer.start();
  trainer.setPlayerPosition({ x: 2.74, y: 2.5 });
  scheduler.advanceTo(stepAt(9) + SPATIAL_BOMBS_TIMING.cannonAfterFinalBombDelayMs);
  assert.equal(trainer.remainingLayers.value.you, 0);
  assert.equal(trainer.phase.value, 'cannon-countdown');
  scheduler.advanceTo(stepAt(9) + SPATIAL_BOMBS_TIMING.cannonAfterFinalBombDelayMs + 5_000);
  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.code, 'cannon');
});
