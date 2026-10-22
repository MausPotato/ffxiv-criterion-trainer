import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useKetudukeTrainer } from '../../src/composables/useKetudukeTrainer.ts';
import { autoQueue } from '../../src/mechanics/ketuduke/queue.ts';
import { solveParty } from '../../src/mechanics/ketuduke/solver.ts';
import { crystalMotionPlan } from '../../src/mechanics/ketuduke/crystals.ts';
import { generateQuestion } from '../../src/mechanics/ketuduke/generation.ts';
import { simulatePlayerWindStep } from '../../src/mechanics/ketuduke/wind.ts';

const FIXED_QUESTION = {
  center: { r: 1, c: 1, o: 'h' },
  crystals: [
    { r: 1, c: 1, o: 'h', q: 0 },
    { r: 0, c: 2, o: 'v', q: 1 },
    { r: 3, c: 0, o: 'v', q: 2 },
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

const UNSOLVABLE_CRYSTAL_QUESTION = {
  ...FIXED_QUESTION,
  crystals: FIXED_QUESTION.crystals.map((crystal, index) => ({
    ...crystal,
    q: index === 0 ? 1 : crystal.q
  }))
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

function completeUntimedPositioning(trainer, question = FIXED_QUESTION) {
  const solution = solveParty(question, 'MT');
  assert.ok(solution);
  trainer.setTimed(false);
  trainer.start();
  trainer.selectCell(autoQueue(question).MT);
  trainer.confirm();
  trainer.nextStep();
  trainer.selectCell(solution.pre.MT);
  trainer.confirm();
  return solution;
}

function repeatingRandom(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

function generatedQuestionForCenter(r, c, orientation) {
  return generateQuestion(repeatingRandom([
    r === 1 ? 0.1 : 0.6,
    c === 1 ? 0.1 : 0.6,
    orientation === 'h' ? 0.6 : 0.1,
    0.1, 0.2, 0.3, 0.4, 0.1
  ]));
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
  assert.equal(trainer.wins.value, 0, 'wins are awarded only after wind resolution');
  assert.equal(trainer.replayActive.value, true);
  assert.equal(trainer.windStep.value, 1);
  assert.equal(scheduler.tasks.size, 3);
});

test('enabled wind replay animates two five-second rounds and settles matching final positions', () => {
  const { trainer, scheduler } = createTrainer();
  const plan = crystalMotionPlan(FIXED_QUESTION);
  assert.ok(plan);
  const solution = completeUntimedPositioning(trainer);

  assert.equal(trainer.phase.value, 2);
  assert.equal(trainer.replayActive.value, true);
  assert.equal(trainer.windStep.value, 1);
  assert.equal(trainer.review.value, false);
  assert.equal(trainer.windEffects.value.length, 2);
  assert.ok(trainer.windEffects.value.every(effect => effect.region === 1 && effect.durationMs === 5_000));
  assert.deepEqual(trainer.playerFinal.value, solution.pre);
  assert.deepEqual(Object.keys(trainer.visiblePositions.value), ['MT'], 'teammates stay hidden during replay');

  scheduler.advanceTo(50);
  const afterFirst = simulatePlayerWindStep(FIXED_QUESTION, solution.pre, 1);
  assert.deepEqual(trainer.playerFinal.value, afterFirst);
  assert.deepEqual(trainer.crystalFinal.value, plan.middle);
  assert.equal(new Set(plan.middle.map(crystal => `${crystal.r},${crystal.c}`)).size, 4);
  assert.equal(afterFirst.D1, solution.pre.D1, 'bind players do not move');
  assert.equal(afterFirst.D2, solution.pre.D2, 'bind players do not move');

  scheduler.advanceTo(4_999);
  assert.equal(trainer.windStep.value, 1);
  scheduler.advanceTo(5_000);
  assert.equal(trainer.windStep.value, 2);
  assert.equal(trainer.windEffects.value.length, 2);
  assert.ok(trainer.windEffects.value.every(effect => effect.region === 2 && effect.durationMs === 5_000));
  assert.deepEqual(trainer.playerFinal.value, solution.final);
  assert.deepEqual(trainer.crystalFinal.value, plan.target);

  scheduler.advanceTo(9_999);
  assert.equal(trainer.review.value, false);
  scheduler.advanceTo(10_000);
  assert.equal(trainer.replayActive.value, false);
  assert.equal(trainer.review.value, true);
  assert.equal(trainer.windStep.value, null);
  assert.deepEqual(trainer.windEffects.value, []);
  assert.deepEqual(trainer.visiblePositions.value, solution.final, 'the party appears only at settlement');
  assert.equal(trainer.settlement.value?.personalPosition, solution.final.MT);
  assert.equal(trainer.settlement.value?.groupOk, true);
  assert.equal(trainer.settlement.value?.allPlayersSafe, true);
  assert.equal(trainer.settlement.value?.valid, true);
  assert.equal(trainer.wins.value, 1);
  assert.equal(trainer.streak.value, 1);
  assert.equal(scheduler.tasks.size, 0);
});

test('all eight configurations replay initial, first-round, and final crystal positions without settlement correction', async t => {
  for (const r of [1, 2]) {
    for (const c of [1, 2]) {
      for (const orientation of ['h', 'v']) {
        await t.test(`center=(${r},${c}), orientation=${orientation}`, () => {
          const question = generatedQuestionForCenter(r, c, orientation);
          const plan = crystalMotionPlan(question);
          assert.ok(plan);
          const { trainer, scheduler } = createTrainer(question);
          const solution = completeUntimedPositioning(trainer, question);

          assert.deepEqual(trainer.crystalFinal.value, question.crystals);
          assert.deepEqual(trainer.playerFinal.value, solution.pre);
          assert.equal(trainer.windStep.value, 1);
          assert.equal(trainer.windEffects.value.length, 2);

          scheduler.advanceTo(50);
          assert.deepEqual(trainer.crystalFinal.value, plan.middle);
          assert.equal(new Set(plan.middle.map(crystal => `${crystal.r},${crystal.c}`)).size, 4);

          scheduler.advanceTo(5_000);
          assert.equal(trainer.windStep.value, 2);
          assert.deepEqual(trainer.crystalFinal.value, plan.target);
          assert.deepEqual(trainer.playerFinal.value, solution.final);
          assert.equal(new Set(plan.target.map(crystal => `${crystal.r},${crystal.c}`)).size, 4);
          const animatedEndpoint = trainer.crystalFinal.value.map(crystal => ({ ...crystal }));

          scheduler.advanceTo(10_000);
          assert.deepEqual(trainer.crystalFinal.value, animatedEndpoint);
          assert.equal(trainer.review.value, true);
          assert.equal(trainer.settlement.value?.geometryOk, true);
          assert.equal(trainer.settlement.value?.allPlayersSafe, true);
          assert.equal(scheduler.tasks.size, 0);
        });
      }
    }
  }
});

test('disabled wind animation settles immediately with the same role and crystal endpoints', () => {
  const { trainer, scheduler } = createTrainer();
  const plan = crystalMotionPlan(FIXED_QUESTION);
  assert.ok(plan);
  trainer.setShowWind(false);
  const solution = completeUntimedPositioning(trainer);

  assert.equal(trainer.replayActive.value, false);
  assert.equal(trainer.review.value, true);
  assert.deepEqual(trainer.windEffects.value, []);
  assert.deepEqual(trainer.playerFinal.value, solution.final);
  assert.deepEqual(trainer.crystalFinal.value, plan.target);
  assert.equal(trainer.settlement.value?.valid, true);
  assert.equal(trainer.wins.value, 1);
  assert.equal(scheduler.tasks.size, 0);
});

test('stack settlement validates MT with D1 and H with D2', () => {
  const { trainer } = createTrainer(STACK_QUESTION);
  trainer.setShowWind(false);
  const solution = completeUntimedPositioning(trainer, STACK_QUESTION);

  assert.equal(solution.final.MT, solution.final.D1);
  assert.equal(solution.final.H, solution.final.D2);
  assert.notEqual(solution.final.MT, solution.final.H);
  assert.equal(trainer.settlement.value?.groupOk, true);
  assert.match(trainer.settlement.value?.groupDetail ?? '', /MT＋D1、H＋D2/);
  assert.equal(trainer.settlement.value?.valid, true);
});

test('an unavailable crystal animation model reports a warning without killing the player', () => {
  const { trainer, scheduler } = createTrainer(UNSOLVABLE_CRYSTAL_QUESTION);
  const solution = completeUntimedPositioning(trainer, UNSOLVABLE_CRYSTAL_QUESTION);

  assert.deepEqual(trainer.playerFinal.value, solution.final);
  assert.equal(trainer.review.value, true);
  assert.equal(trainer.settlement.value?.geometryOk, false);
  assert.equal(trainer.settlement.value?.valid, false);
  assert.match(trainer.settlement.value?.summary ?? '', /不判定玩家死亡/);
  assert.equal(trainer.death.value.open, false);
  assert.equal(trainer.wins.value, 0);
  assert.equal(scheduler.tasks.size, 0);
});

test('switching questions during wind replay clears stale role, crystal, and animation callbacks', () => {
  const { trainer, scheduler } = createTrainer();
  completeUntimedPositioning(trainer);
  scheduler.advanceTo(50);
  assert.equal(trainer.replayActive.value, true);
  assert.ok(trainer.playerFinal.value);
  assert.equal(trainer.crystalFinal.value.length, 4);

  trainer.newQuestion();
  assert.equal(trainer.ready.value, false);
  assert.equal(trainer.playerFinal.value, null);
  assert.deepEqual(trainer.crystalFinal.value, []);
  assert.equal(trainer.review.value, false);
  assert.equal(trainer.settlement.value, null);
  assert.deepEqual(trainer.windEffects.value, []);
  assert.equal(scheduler.tasks.size, 0);

  scheduler.advanceTo(60_000);
  assert.equal(trainer.playerFinal.value, null);
  assert.deepEqual(trainer.crystalFinal.value, []);
  assert.equal(trainer.wins.value, 0);
});

test('retrying during wind replay clears the replay and starts the same question cleanly', () => {
  const { trainer, scheduler } = createTrainer();
  completeUntimedPositioning(trainer);
  scheduler.advanceTo(50);

  trainer.retry();

  assert.equal(trainer.ready.value, true);
  assert.equal(trainer.phase.value, 0);
  assert.equal(trainer.playerFinal.value, null);
  assert.deepEqual(trainer.crystalFinal.value, []);
  assert.equal(trainer.replayActive.value, false);
  assert.equal(trainer.review.value, false);
  assert.equal(scheduler.tasks.size, 0);
});

test('disposing the trainer scope clears every replay callback', () => {
  const scheduler = new FakeScheduler();
  const scope = effectScope();
  let trainer;
  scope.run(() => {
    trainer = useKetudukeTrainer({
      scheduler,
      questionFactory: () => structuredClone(FIXED_QUESTION)
    });
    trainer.selectRole('MT');
  });
  completeUntimedPositioning(trainer);
  assert.equal(scheduler.tasks.size, 3);

  scope.stop();

  assert.equal(scheduler.tasks.size, 0);
  scheduler.advanceTo(60_000);
  assert.equal(trainer.review.value, false);
  assert.equal(trainer.wins.value, 0);
});

test('turning off wind animation during replay cancels callbacks and settles without a death', () => {
  const { trainer, scheduler } = createTrainer();
  const solution = completeUntimedPositioning(trainer);
  scheduler.advanceTo(50);

  trainer.setShowWind(false);

  assert.equal(trainer.replayActive.value, false);
  assert.equal(trainer.review.value, true);
  assert.deepEqual(trainer.windEffects.value, []);
  assert.deepEqual(trainer.playerFinal.value, solution.final);
  assert.equal(trainer.death.value.open, false);
  assert.equal(trainer.settlement.value?.valid, true);
  assert.equal(scheduler.tasks.size, 0);
});

test('wind replay keeps skip and retry controls available', () => {
  const { trainer, scheduler } = createTrainer();
  completeUntimedPositioning(trainer);

  assert.equal(trainer.confirmText.value, '略過動畫');
  assert.equal(trainer.confirmDisabled.value, false);
  assert.equal(trainer.resetText.value, '重試本題');
  assert.equal(trainer.resetDisabled.value, false);

  trainer.confirm();
  assert.equal(trainer.review.value, true);
  assert.equal(trainer.confirmText.value, '下一題');
  assert.equal(scheduler.tasks.size, 0);

  trainer.resetStage();
  assert.equal(trainer.phase.value, 0);
  assert.equal(trainer.ready.value, true);
  assert.equal(trainer.review.value, false);
  assert.equal(trainer.resetText.value, '重設本階段');
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
