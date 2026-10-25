import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useLalaRuAnalysisTrainer } from '../../src/composables/useLalaRuAnalysisTrainer.ts';
import { ANALYSIS_TIMING } from '../../src/mechanics/lalaru/analysis-timing.ts';

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
}

function createTrainer(question = { debuff: 'front', orbPosition: { x: 2.5, y: .5 } }) {
  const scheduler = new FakeScheduler();
  const trainer = useLalaRuAnalysisTrainer({ scheduler, questionFactory: () => question });
  return { scheduler, trainer };
}

test('analysis resolves once after the configured delay using settlement position and facing', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();
  trainer.setPlayerFacingAngle(0);
  scheduler.advanceTo(ANALYSIS_TIMING.resolveMs - 1);
  assert.equal(trainer.phase.value, 'active');
  scheduler.advanceTo(ANALYSIS_TIMING.resolveMs);
  assert.equal(trainer.phase.value, 'resolved');
  assert.equal(trainer.result.value, true);
  assert.equal(trainer.attempts.value, 1);
  assert.equal(trainer.successes.value, 1);
  assert.deepEqual(trainer.settlementPosition.value, trainer.playerPosition.value);
  assert.equal(trainer.settlementFacingAngle.value, 0);
});

test('manual explosion uses the same gap collision and cannot settle twice', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();
  trainer.setPlayerFacingAngle(180);
  trainer.resolve();
  trainer.resolve();
  scheduler.advanceTo(ANALYSIS_TIMING.resolveMs);
  assert.equal(trainer.result.value, false);
  assert.equal(trainer.attempts.value, 1);
  assert.equal(scheduler.tasks.size, 0);
});

test('repeated starts do not create duplicate explosions', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();
  trainer.start();
  trainer.start();
  assert.equal(scheduler.tasks.size, 1);
  scheduler.advanceTo(ANALYSIS_TIMING.resolveMs);
  assert.equal(trainer.attempts.value, 1);
});

test('retry and next question clear stale timers and reset movement state', () => {
  let index = 0;
  const questions = [
    { debuff: 'front', orbPosition: { x: 2.5, y: .5 } },
    { debuff: 'right', orbPosition: { x: 4.5, y: 2.5 } }
  ];
  const scheduler = new FakeScheduler();
  const trainer = useLalaRuAnalysisTrainer({ scheduler, questionFactory: () => questions[index++] });
  trainer.start();
  trainer.setPlayerPosition({ x: 1, y: 1 });
  trainer.setPlayerFacingAngle(73);
  trainer.retry();
  assert.equal(scheduler.tasks.size, 0);
  assert.equal(trainer.phase.value, 'idle');
  assert.deepEqual(trainer.playerPosition.value, { x: 2.5, y: 3.7 });
  assert.equal(trainer.playerFacingAngle.value, 0);
  assert.equal(trainer.question.value.debuff, 'front');

  trainer.nextQuestion();
  assert.equal(trainer.question.value.debuff, 'right');
});

test('disposing the trainer clears the pending explosion', () => {
  const scheduler = new FakeScheduler();
  const scope = effectScope();
  let trainer;
  scope.run(() => {
    trainer = useLalaRuAnalysisTrainer({
      scheduler,
      questionFactory: () => ({ debuff: 'front', orbPosition: { x: 2.5, y: .5 } })
    });
  });
  trainer.start();
  assert.equal(scheduler.tasks.size, 1);
  scope.stop();
  assert.equal(scheduler.tasks.size, 0);
});
