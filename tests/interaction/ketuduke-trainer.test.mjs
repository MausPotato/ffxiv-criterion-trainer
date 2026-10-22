import test from 'node:test';
import assert from 'node:assert/strict';
import { useKetudukeTrainer } from '../../src/composables/useKetudukeTrainer.ts';
import { autoQueue } from '../../src/mechanics/ketuduke/queue.ts';
import { solveParty } from '../../src/mechanics/ketuduke/solver.ts';

const FIXED_QUESTION = {
  center: { r: 1, c: 1, o: 'h' },
  crystals: [
    { r: 1, c: 1, o: 'h', q: 0 },
    { r: 0, c: 2, o: 'v', q: 1 },
    { r: 2, c: 0, o: 'v', q: 2 },
    { r: 3, c: 3, o: 'h', q: 3 }
  ],
  buffs: { MT: 'bubble', H: 'bubble', D1: 'bind', D2: 'bind' },
  party: '分散',
  rotation: 'cw'
};

const STACK_QUESTION = {
  ...FIXED_QUESTION,
  party: '分攤'
};

class FakeScheduler {
  time = 0;
  nextId = 1;
  tasks = new Map();

  now = () => this.time;

  setTimeout = (callback, delay) => {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.time + delay, callback });
    return id;
  };

  clearTimeout = id => {
    this.tasks.delete(id);
  };

  advanceTo(target) {
    while (true) {
      const due = [...this.tasks.entries()]
        .filter(([, task]) => task.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;
      const [id, task] = due;
      this.tasks.delete(id);
      this.time = task.at;
      task.callback();
    }
    this.time = target;
  }

  elapseWithoutCallbacks(target) {
    this.time = target;
  }
}

function createTrainer(fixedQuestion = FIXED_QUESTION) {
  const scheduler = new FakeScheduler();
  const trainer = useKetudukeTrainer({
    scheduler,
    questionFactory: () => structuredClone(fixedQuestion)
  });
  trainer.selectRole('MT');
  return { trainer, scheduler };
}

test('does not schedule or count down before the player presses start', () => {
  const { trainer, scheduler } = createTrainer();

  scheduler.advanceTo(20_000);

  assert.equal(trainer.ready.value, false);
  assert.equal(trainer.elapsedMs.value, 0);
  assert.equal(trainer.mahVisible.value, false);
  assert.equal(scheduler.tasks.size, 0);
});

test('early queue confirmation immediately starts a complete five-second pre-position window', () => {
  const { trainer, scheduler } = createTrainer();
  const queueCell = autoQueue(FIXED_QUESTION).MT;
  trainer.start();
  assert.equal(trainer.queueStartedAtMs.value, 0);
  assert.equal(trainer.queueDeadlineAtMs.value, 5_000);
  scheduler.advanceTo(1_000);
  trainer.selectCell(queueCell);
  assert.equal(trainer.displayPosition.value, queueCell);
  trainer.confirm();

  assert.equal(trainer.hasChecked.value, true);
  assert.equal(trainer.phase.value, 1);
  assert.equal(trainer.mahVisible.value, true);
  assert.equal(trainer.stageStartedAtMs.value, 1_000);
  assert.equal(trainer.stageDeadlineAtMs.value, 6_000);
  assert.equal(trainer.queueDeadlineAtMs.value, 5_000, 'the first-stage deadline remains independently recorded');
  assert.equal(trainer.preStartedAtMs.value, 1_000);
  assert.equal(trainer.preDeadlineAtMs.value, 6_000);
  assert.equal(trainer.elapsedMs.value, 0);
  assert.equal(trainer.displayPosition.value, queueCell, 'manual confirmation keeps the player on the queue cell');
  assert.deepEqual(trainer.queue.value, autoQueue(FIXED_QUESTION));

  scheduler.advanceTo(5_900);
  assert.equal(trainer.phase.value, 1);
  assert.equal(trainer.death.value.open, false);
});

test('correct queue at 4.9 seconds passes, remains visible, and pre-position at 4.9 seconds passes', () => {
  const { trainer, scheduler } = createTrainer();
  const queueAnswer = autoQueue(FIXED_QUESTION);
  const solution = solveParty(FIXED_QUESTION, 'MT');
  assert.ok(solution);

  trainer.start();
  scheduler.advanceTo(4_900);
  trainer.selectCell(queueAnswer.MT);
  assert.equal(trainer.displayPosition.value, queueAnswer.MT);
  scheduler.advanceTo(5_000);
  assert.equal(trainer.phase.value, 1);
  assert.equal(trainer.stageStartedAtMs.value, 5_000);
  assert.equal(trainer.stageDeadlineAtMs.value, 10_000);
  assert.equal(trainer.queueDeadlineAtMs.value, 5_000);
  assert.equal(trainer.preDeadlineAtMs.value, 10_000);
  assert.equal(trainer.displayPosition.value, queueAnswer.MT, 'automatic queue confirmation keeps the player visible');
  assert.deepEqual(trainer.queue.value, queueAnswer);

  scheduler.advanceTo(9_900);
  trainer.selectCell(solution.pre.MT);
  assert.equal(trainer.displayPosition.value, solution.pre.MT, 'the player moves only after choosing a pre-position');
  scheduler.advanceTo(10_000);

  assert.equal(trainer.phase.value, 2);
  assert.equal(trainer.death.value.open, false);
  assert.equal(trainer.hasChecked.value, true);
  assert.equal(trainer.preConfirmed.value, true);
  assert.deepEqual(trainer.queue.value, queueAnswer);
  assert.equal(trainer.pre.value.MT, solution.pre.MT);
  assert.equal(trainer.wins.value, 0, 'wins are awarded only after the not-yet-ported wind resolution');
  assert.equal(scheduler.tasks.size, 0);
});

test('an unanswered queue window dies at five seconds', () => {
  const { trainer, scheduler } = createTrainer();
  trainer.start();

  scheduler.advanceTo(4_900);
  assert.equal(trainer.death.value.open, false);
  scheduler.advanceTo(5_100);

  assert.equal(trainer.phase.value, 0);
  assert.equal(trainer.death.value.open, true);
  assert.match(trainer.death.value.reason, /請選自己的排隊位置/);
  assert.equal(scheduler.tasks.size, 0);
});

test('an unfinished pre-position window dies five seconds after entering phase two', () => {
  const { trainer, scheduler } = createTrainer();
  trainer.start();
  trainer.selectCell(autoQueue(FIXED_QUESTION).MT);
  trainer.confirm();

  assert.equal(trainer.phase.value, 1);
  assert.equal(trainer.stageDeadlineAtMs.value, 5_000);
  scheduler.advanceTo(4_900);
  assert.equal(trainer.death.value.open, false);
  scheduler.advanceTo(5_100);

  assert.equal(trainer.death.value.open, true);
  assert.match(trainer.death.value.reason, /請選自己的吹風前站位/);
  assert.deepEqual(trainer.queue.value, autoQueue(FIXED_QUESTION));
  assert.equal(trainer.displayPosition.value, autoQueue(FIXED_QUESTION).MT);
});

test('late input cannot beat a delayed queue timer callback', () => {
  const { trainer, scheduler } = createTrainer();
  trainer.start();

  scheduler.elapseWithoutCallbacks(5_001);
  trainer.selectCell(autoQueue(FIXED_QUESTION).MT);

  assert.equal(trainer.death.value.open, true);
  assert.equal(trainer.queue.value.MT, undefined, 'the late queue selection is not recorded');
  assert.equal(trainer.phase.value, 0);
  assert.equal(scheduler.tasks.size, 0);
});

test('late input cannot overwrite the locked queue answer during the second stage', () => {
  const { trainer, scheduler } = createTrainer();
  const queueAnswer = autoQueue(FIXED_QUESTION);
  const solution = solveParty(FIXED_QUESTION, 'MT');
  assert.ok(solution);

  trainer.start();
  trainer.selectCell(queueAnswer.MT);
  trainer.confirm();
  const lockedQueue = { ...trainer.queue.value };

  scheduler.elapseWithoutCallbacks(5_001);
  trainer.selectCell(solution.pre.MT);

  assert.equal(trainer.death.value.open, true);
  assert.deepEqual(trainer.queue.value, lockedQueue, 'the first-stage answer remains unchanged');
  assert.equal(trainer.pre.value.MT, undefined, 'the late pre-position is not recorded');
  assert.equal(scheduler.tasks.size, 0);
});

test('mahjong run hint appears only after reveal and follows the spread mechanic regions', () => {
  const { trainer, scheduler } = createTrainer();

  assert.equal(trainer.mahjongRunHint.value, null);
  trainer.start();
  assert.equal(trainer.mahjongRunHint.value, null, 'the queue phase must not show a run hint');

  trainer.selectCell(autoQueue(FIXED_QUESTION).MT);
  scheduler.advanceTo(5_000);
  assert.deepEqual(trainer.mahjongRunHint.value, { bubble: 1, bind: 2 });

  trainer.retry();
  assert.equal(trainer.mahjongRunHint.value, null, 'retry resets to a new queue window');
  trainer.newQuestion();
  assert.equal(trainer.mahjongRunHint.value, null, 'a new question resets the reveal hint');
});

test('waterfall mechanic sends both bubble and bind players to region one', () => {
  const { trainer, scheduler } = createTrainer(STACK_QUESTION);
  trainer.start();

  assert.equal(trainer.mahjongRunHint.value, null);
  trainer.selectCell(autoQueue(STACK_QUESTION).MT);
  scheduler.advanceTo(5_000);

  assert.deepEqual(trainer.mahjongRunHint.value, { bubble: 1, bind: 1 });
});

test('timeout, retry, and new question leave no stale timer callbacks', () => {
  const { trainer, scheduler } = createTrainer();
  trainer.start();

  scheduler.advanceTo(5_000);
  assert.equal(trainer.death.value.open, true);
  assert.equal(scheduler.tasks.size, 0);

  trainer.retry();
  assert.equal(trainer.ready.value, true);
  assert.equal(trainer.mahVisible.value, false);
  assert.equal(trainer.lockPosition.value, false);
  assert.equal(scheduler.tasks.size, 1);
  scheduler.advanceTo(9_900);
  assert.equal(trainer.death.value.open, false);

  trainer.newQuestion();
  assert.equal(trainer.ready.value, false);
  assert.equal(trainer.elapsedMs.value, 0);
  assert.equal(scheduler.tasks.size, 0);

  trainer.start();
  assert.equal(scheduler.tasks.size, 1);
  trainer.newQuestion();
  assert.equal(scheduler.tasks.size, 0);
  scheduler.advanceTo(60_000);
  assert.equal(trainer.ready.value, false);
  assert.equal(trainer.mahVisible.value, false);
});

test('an incorrect submitted position opens YOU DIED and stops the timer', () => {
  const { trainer, scheduler } = createTrainer();
  const correct = autoQueue(FIXED_QUESTION).MT;
  trainer.start();
  trainer.selectCell((correct + 1) % 16);
  trainer.confirm();

  assert.equal(trainer.death.value.open, true);
  assert.equal(
    trainer.death.value.reason,
    '你的排隊位置不符：MT 應站第 2 直行、第 2 橫列。'
  );
  assert.equal(trainer.lockPosition.value, true);
  assert.equal(scheduler.tasks.size, 0);
});

test('non-timed mode supports queue and pre-position practice without a deadline', () => {
  const { trainer, scheduler } = createTrainer();
  const solution = solveParty(FIXED_QUESTION, 'MT');
  assert.ok(solution);

  trainer.setTimed(false);
  trainer.start();
  assert.equal(trainer.mahjongRunHint.value, null);
  scheduler.advanceTo(60_000);
  assert.equal(trainer.elapsedMs.value, 0);
  assert.equal(trainer.phase.value, 0);
  assert.equal(scheduler.tasks.size, 0);

  trainer.selectCell(autoQueue(FIXED_QUESTION).MT);
  trainer.confirm();
  assert.equal(trainer.phase.value, 0);
  trainer.nextStep();
  assert.equal(trainer.phase.value, 1);
  assert.deepEqual(trainer.mahjongRunHint.value, { bubble: 1, bind: 2 });

  trainer.selectCell(solution.pre.MT);
  trainer.confirm();
  assert.equal(trainer.phase.value, 2);
  assert.equal(trainer.death.value.open, false);
});
