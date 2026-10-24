import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useLalaRuTrainer } from '../../src/composables/useLalaRuTrainer.ts';
import { LALARU_TIMING } from '../../src/mechanics/lalaru/timing.ts';

const FIXED_QUESTION = {
  initialSafeDirection: 'south',
  arrowSide: 'left',
  multiplier: 'III',
  dotPattern: 5
};

class FakeScheduler {
  now = 0;
  nextId = 1;
  tasks = new Map();

  setTimeout = (callback, delay) => {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.now + delay, callback });
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
      this.now = task.at;
      task.callback();
    }
    this.now = target;
  }
}

function createTrainer() {
  const scheduler = new FakeScheduler();
  const trainer = useLalaRuTrainer({
    scheduler,
    questionFactory: () => structuredClone(FIXED_QUESTION)
  });
  return { scheduler, trainer };
}

test('resolution swaps the telegraph to the final east sector and uses it for collision', () => {
  const { scheduler, trainer } = createTrainer();
  assert.equal(trainer.displayedSafeDirection.value, 'south');
  trainer.setPlayerPosition({ x: 4.2, y: 2.5 });
  trainer.start();
  assert.equal(trainer.phase.value, 'casting');
  assert.equal(trainer.displayedSafeDirection.value, 'south');

  scheduler.advanceTo(LALARU_TIMING.resolveMs);
  assert.equal(trainer.phase.value, 'resolved');
  assert.equal(trainer.displayedSafeDirection.value, 'east');
  assert.equal(trainer.succeeded.value, true);
  assert.deepEqual(trainer.settlementPosition.value, { x: 4.2, y: 2.5 });
});

test('a player outside the final sector fails', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.setPlayerPosition({ x: .8, y: 2.5 });
  trainer.start();
  scheduler.advanceTo(LALARU_TIMING.resolveMs);
  assert.equal(trainer.succeeded.value, false);
});

test('white dots count down on configurable steps and do not cause an early hit', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();
  assert.equal(trainer.dotCount.value, 5);
  scheduler.advanceTo(LALARU_TIMING.dotFirstChangeMs);
  assert.equal(trainer.dotCount.value, 4);
  assert.equal(trainer.phase.value, 'casting');
  scheduler.advanceTo(LALARU_TIMING.dotFirstChangeMs + LALARU_TIMING.dotStepMs * 3);
  assert.equal(trainer.dotCount.value, 1);
  assert.equal(trainer.phase.value, 'casting');
});

test('repeated start clicks cannot schedule duplicate settlement', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();
  const scheduled = scheduler.tasks.size;
  trainer.start();
  trainer.start();
  assert.equal(scheduler.tasks.size, scheduled);
  scheduler.advanceTo(LALARU_TIMING.resolveMs);
  assert.equal(trainer.attempts.value, 1);
});

test('retry and next question clear every stale timer and animation state', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();
  scheduler.advanceTo(LALARU_TIMING.dotFirstChangeMs);
  assert.equal(trainer.dotCount.value, 4);
  trainer.retry();
  assert.equal(scheduler.tasks.size, 0);
  assert.equal(trainer.phase.value, 'idle');
  assert.equal(trainer.dotCount.value, 5);
  scheduler.advanceTo(60_000);
  assert.equal(trainer.phase.value, 'idle');

  trainer.start();
  trainer.nextQuestion();
  assert.equal(scheduler.tasks.size, 0);
  assert.equal(trainer.phase.value, 'idle');
});

test('disposing the trainer clears all countdown and settlement callbacks', () => {
  const scheduler = new FakeScheduler();
  const scope = effectScope();
  let trainer;
  scope.run(() => {
    trainer = useLalaRuTrainer({ scheduler, questionFactory: () => structuredClone(FIXED_QUESTION) });
  });
  trainer.start();
  assert.ok(scheduler.tasks.size > 0);
  scope.stop();
  assert.equal(scheduler.tasks.size, 0);
});
