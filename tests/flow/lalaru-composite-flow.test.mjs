import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useLalaRuCompositeTrainer } from '../../src/composables/useLalaRuCompositeTrainer.ts';
import { COMPOSITE_TIMING } from '../../src/mechanics/lalaru/composite-timing.ts';
import { LALARU_PLAYER_START } from '../../src/mechanics/lalaru/geometry.ts';
import { attackSourceAngle } from '../../src/mechanics/lalaru/analysis.ts';
import { gridCellCenter, isPointInDangerousCells } from '../../src/mechanics/lalaru/composite-pattern.ts';
import { isAttackInAnalysisGap } from '../../src/mechanics/lalaru/analysis.ts';
import { cameraPointToWorldPoint, worldPointToCameraPoint } from '../../src/presentation/lalaru/camera.ts';

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
  now = () => this.time;

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

function createTrainer() {
  const scheduler = new FakeScheduler();
  const trainer = useLalaRuCompositeTrainer({
    scheduler,
    initialOrientation: 'north-south',
    initialOrbOrder: 'upper-first',
    initialRouteVariant: 'primary',
    initialAnalysisDebuff: 'front',
    initialBossQuestion: {
      initialSafeDirection: 'south',
      arrowSide: 'left',
      multiplier: 'III',
      dotPattern: 5
    },
    initialPlayerRotationCue: {
      arrowSide: 'left',
      multiplier: 'III',
      dotPattern: 5
    }
  });
  return { scheduler, trainer };
}

const debuffOffsets = { front: 0, right: 90, back: 180, left: -90 };
const PATTERN_T0_MS = COMPOSITE_TIMING.analysisLeadInMs;
const FIRST_ACTIVATION_MS = PATTERN_T0_MS + COMPOSITE_TIMING.previewDurationMs;

function facingForOrb(playerPosition, orbCell, debuff) {
  const source = attackSourceAngle(playerPosition, gridCellCenter(orbCell));
  return source - debuffOffsets[debuff];
}

const FIRST_ORB_TIME = FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs;
const SECOND_ORB_TIME = FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs * 9;

function startAndPassFirstOrb(scheduler, trainer) {
  const firstOrb = trainer.pattern.value.orbs[0];
  trainer.setPlayerFacingAngle(facingForOrb(trainer.playerPosition.value, firstOrb.cell, trainer.analysisDebuff.value));
  trainer.start();
  scheduler.advanceTo(FIRST_ORB_TIME);
  assert.equal(trainer.deathRecord.value, null);
}

function prepareForCannonAndSecondOrb(trainer) {
  trainer.setPlayerPosition({ x: 2.7, y: 2.5 });
  const secondOrb = trainer.pattern.value.orbs[1];
  trainer.setPlayerFacingAngle(facingForOrb(trainer.playerPosition.value, secondOrb.cell, trainer.analysisDebuff.value));
}

function advanceThroughSecondOrb(scheduler, trainer) {
  startAndPassFirstOrb(scheduler, trainer);
  prepareForCannonAndSecondOrb(trainer);
  scheduler.advanceTo(SECOND_ORB_TIME);
  assert.equal(trainer.deathRecord.value, null);
}

test('analysis appears before T0, then preview lasts three seconds before stepping', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();
  assert.equal(trainer.phase.value, 'analysis-lead');
  scheduler.advanceTo(PATTERN_T0_MS - 1);
  assert.equal(trainer.phase.value, 'analysis-lead');
  scheduler.advanceTo(PATTERN_T0_MS);
  assert.equal(trainer.phase.value, 'preview');
  assert.equal(trainer.bossCannonState.value, 'hidden');
  scheduler.advanceTo(FIRST_ACTIVATION_MS - 1);
  assert.equal(trainer.currentStep.value, -1);
  assert.equal(trainer.dangerousCells.value.length, 0);

  scheduler.advanceTo(FIRST_ACTIVATION_MS);
  assert.equal(trainer.phase.value, 'stepping');
  assert.equal(trainer.currentStep.value, 0);
  assert.equal(trainer.bossCannonState.value, 'hidden');
  assert.deepEqual(trainer.activeCells.value, [{ row: 4, col: 0 }, { row: 0, col: 4 }]);

  scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs);
  assert.equal(trainer.currentStep.value, 1);
  assert.equal(trainer.bossCannonState.value, 'waiting');
  assert.deepEqual(trainer.activeCells.value, [{ row: 3, col: 0 }, { row: 1, col: 4 }]);
});

test('repeated start clicks cannot duplicate the step timeline', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();
  trainer.start();
  trainer.start();
  assert.equal(scheduler.tasks.size, 1);
  scheduler.advanceTo(FIRST_ACTIVATION_MS);
  assert.equal(trainer.currentStep.value, 0);
});

test('danger persists, and the two orbs trigger only when an active route enters their cells', () => {
  const { scheduler, trainer } = createTrainer();
  const firstOrb = trainer.pattern.value.orbs[0];
  trainer.setPlayerFacingAngle(facingForOrb(trainer.playerPosition.value, firstOrb.cell, 'front'));
  trainer.start();
  scheduler.advanceTo(FIRST_ACTIVATION_MS);
  assert.equal(trainer.explosionCount.value, 0);

  scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs);
  assert.equal(trainer.explosionCount.value, 1);
  assert.deepEqual(trainer.explodedOrbIds.value, ['orb-a']);
  prepareForCannonAndSecondOrb(trainer);

  scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs * 8);
  assert.equal(trainer.explosionCount.value, 1);
  scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs * 9);
  assert.equal(trainer.explosionCount.value, 2);
  assert.deepEqual(trainer.explodedOrbIds.value, ['orb-a', 'orb-b']);
  assert.equal(trainer.dangerousCells.value.length, 20);
});

test('all four debuffs reuse the analysis gap collision when the first orb explodes', () => {
  for (const debuff of ['front', 'back', 'left', 'right']) {
    const scheduler = new FakeScheduler();
    const trainer = useLalaRuCompositeTrainer({
      scheduler,
      initialOrientation: 'north-south',
      initialOrbOrder: 'upper-first',
      initialRouteVariant: 'primary',
      initialAnalysisDebuff: debuff
    });
    const firstOrb = trainer.pattern.value.orbs[0];
    trainer.setPlayerFacingAngle(facingForOrb(trainer.playerPosition.value, firstOrb.cell, debuff));
    trainer.start();
    scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs);
    assert.equal(trainer.orbAnalysisResults.value.length, 1, debuff);
    assert.equal(trainer.orbAnalysisResults.value[0].succeeded, true, debuff);
  }
});

test('a failed first orb records one death and stops every later event', () => {
  const { scheduler, trainer } = createTrainer();
  const [firstOrb] = trainer.pattern.value.orbs;
  trainer.setPlayerFacingAngle(facingForOrb(trainer.playerPosition.value, firstOrb.cell, 'front') + 180);
  trainer.start();
  scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs);
  assert.equal(trainer.orbAnalysisResults.value[0].succeeded, false);
  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.event, 'orb-a');
  assert.equal(trainer.activeTimerCount(), 0);
  scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs * 9);
  assert.equal(trainer.orbAnalysisResults.value.length, 1);
  assert.deepEqual(trainer.explodedOrbIds.value, ['orb-a']);
  assert.equal(trainer.analysisFailed.value, true);
  assert.equal(trainer.bossCannonState.value, 'hidden');
  assert.equal(trainer.playerRotationState.value, 'hidden');
});

test('lower-first questions trigger the lower orb before the upper orb', () => {
  const scheduler = new FakeScheduler();
  const trainer = useLalaRuCompositeTrainer({
    scheduler,
    initialOrientation: 'north-south',
    initialOrbOrder: 'lower-first',
    initialRouteVariant: 'primary',
    initialAnalysisDebuff: 'front',
    initialBossQuestion: {
      initialSafeDirection: 'south', arrowSide: 'left', multiplier: 'III', dotPattern: 5
    }
  });
  startAndPassFirstOrb(scheduler, trainer);
  assert.deepEqual(trainer.pattern.value.orbs[0].cell, { row: 3, col: 0 });
  assert.deepEqual(trainer.explodedOrbIds.value, ['orb-a']);
  prepareForCannonAndSecondOrb(trainer);
  scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs * 9);
  assert.deepEqual(trainer.pattern.value.orbs[1].cell, { row: 0, col: 3 });
  assert.deepEqual(trainer.explodedOrbIds.value, ['orb-a', 'orb-b']);
});

test('entering a persistent danger tile immediately freezes the mechanism as dead', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();
  scheduler.advanceTo(FIRST_ACTIVATION_MS);
  trainer.setPlayerPosition({ x: 0.5, y: 4.5 });
  assert.equal(trainer.hasFailed.value, true);
  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.event, 'danger-floor');
  const frozenStep = trainer.currentStep.value;

  scheduler.advanceTo(
    FIRST_ACTIVATION_MS
      + COMPOSITE_TIMING.stepIntervalMs * 9
      + COMPOSITE_TIMING.playerRotationCueDelayMs
      + COMPOSITE_TIMING.playerRotationResolveMs
      + COMPOSITE_TIMING.highPrecisionDelayMs
  );
  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.currentStep.value, frozenStep);
  assert.equal(trainer.succeeded.value, false);
});

test('an inactive route cell is harmless until it activates under the player', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.setPlayerPosition({ x: 0.5, y: 3.5 });
  trainer.start();
  scheduler.advanceTo(FIRST_ACTIVATION_MS);
  assert.equal(trainer.currentStep.value, 0);
  assert.equal(trainer.deathRecord.value, null);
  assert.equal(isPointInDangerousCells(trainer.playerPosition.value, trainer.dangerousCells.value), false);

  scheduler.advanceTo(FIRST_ORB_TIME);
  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.event, 'danger-floor');
  assert.deepEqual(trainer.deathRecord.value.playerPosition, { x: 0.5, y: 3.5 });
  assert.equal(trainer.explosionCount.value, 0, 'floor damage resolves before the orb on the same step');
});

test('the second orb uses its own world position and kills on a mismatched gap', () => {
  const { scheduler, trainer } = createTrainer();
  startAndPassFirstOrb(scheduler, trainer);
  trainer.setPlayerPosition({ x: 2.7, y: 2.5 });
  const secondOrb = trainer.pattern.value.orbs[1];
  trainer.setPlayerFacingAngle(
    facingForOrb(trainer.playerPosition.value, secondOrb.cell, 'front') + 180
  );
  scheduler.advanceTo(SECOND_ORB_TIME);

  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.event, 'orb-b');
  assert.deepEqual(trainer.deathRecord.value.sourcePosition, gridCellCenter(secondOrb.cell));
  assert.equal(trainer.orbAnalysisResults.value.length, 2);
  assert.equal(trainer.orbAnalysisResults.value[1].succeeded, false);
  assert.equal(trainer.playerRotationState.value, 'hidden');
});

test('boss cannon checks only its final safe sector and kills outside it', () => {
  const { scheduler, trainer } = createTrainer();
  startAndPassFirstOrb(scheduler, trainer);
  const cannonResolveTime = FIRST_ORB_TIME
    + COMPOSITE_TIMING.bossCannonAfterFirstOrbDelayMs
    + COMPOSITE_TIMING.bossCannonResolveMs;
  scheduler.advanceTo(cannonResolveTime - 1);
  assert.equal(trainer.deathRecord.value, null);
  scheduler.advanceTo(cannonResolveTime);

  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.event, 'boss-cannon');
  assert.equal(trainer.deathRecord.value.finalSafeDirection, 'east');
  assert.deepEqual(trainer.deathRecord.value.sourcePosition, { x: 2.5, y: 2.5 });
  assert.equal(trainer.bossCannonSucceeded.value, false);
});

test('the first orb starts the complete first-mechanic cannon cast while the second orb remains at pathIndex 9', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();

  const firstOrb = trainer.pattern.value.orbs[0];
  trainer.setPlayerFacingAngle(facingForOrb(trainer.playerPosition.value, firstOrb.cell, 'front'));
  const firstOrbTime = FIRST_ORB_TIME;
  scheduler.advanceTo(firstOrbTime - 1);
  assert.equal(trainer.bossCannonState.value, 'hidden');
  scheduler.advanceTo(firstOrbTime);
  assert.equal(trainer.bossCannonState.value, 'waiting');
  const cannonStartTime = firstOrbTime + COMPOSITE_TIMING.bossCannonAfterFirstOrbDelayMs;
  scheduler.advanceTo(cannonStartTime - 1);
  assert.equal(trainer.bossCannonState.value, 'waiting');
  scheduler.advanceTo(cannonStartTime);
  assert.equal(trainer.bossCannonState.value, 'telegraph');
  assert.equal(trainer.bossDotCount.value, 5);
  assert.equal(trainer.explosionCount.value, 1);
  prepareForCannonAndSecondOrb(trainer);

  scheduler.advanceTo(cannonStartTime + 1_000);
  assert.equal(trainer.bossDotCount.value, 4);
  scheduler.advanceTo(cannonStartTime + 4_000);
  assert.equal(trainer.bossDotCount.value, 1);
  assert.equal(trainer.bossCannonState.value, 'telegraph');
  scheduler.advanceTo(cannonStartTime + COMPOSITE_TIMING.bossCannonResolveMs);
  assert.equal(trainer.bossCannonState.value, 'resolving');
  assert.equal(typeof trainer.bossCannonSucceeded.value, 'boolean');

  scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs * 8);
  assert.equal(trainer.currentStep.value, 8);
  assert.equal(trainer.explosionCount.value, 1);
  scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs * 9);
  assert.equal(trainer.currentStep.value, 9);
  assert.equal(trainer.routeCellNumber.value, 10);
  assert.equal(trainer.completedMoveCount.value, 9);
  assert.equal(trainer.explosionCount.value, 2);
});

test('pausing after the first orb freezes and resumes the boss cannon countdown', () => {
  const { scheduler, trainer } = createTrainer();
  const firstOrbTime = FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs;
  const cannonStartTime = firstOrbTime + COMPOSITE_TIMING.bossCannonAfterFirstOrbDelayMs;
  trainer.start();
  scheduler.advanceTo(cannonStartTime + 500);
  trainer.togglePause();
  scheduler.advanceTo(cannonStartTime + 5_000);
  assert.equal(trainer.bossCannonState.value, 'telegraph');
  assert.equal(trainer.bossDotCount.value, 5);

  trainer.togglePause();
  scheduler.advanceTo(cannonStartTime + 5_499);
  assert.equal(trainer.bossCannonState.value, 'telegraph');
  scheduler.advanceTo(cannonStartTime + 9_700);
  assert.equal(trainer.bossCannonState.value, 'resolving');
});

test('pausing during the first orb explosion also freezes the delayed cannon appearance', () => {
  const { scheduler, trainer } = createTrainer();
  const firstOrbTime = FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs;
  trainer.start();
  scheduler.advanceTo(firstOrbTime + 300);
  assert.equal(trainer.bossCannonState.value, 'waiting');
  trainer.togglePause();
  scheduler.advanceTo(firstOrbTime + 2_000);
  assert.equal(trainer.bossCannonState.value, 'waiting');
  trainer.togglePause();
  scheduler.advanceTo(firstOrbTime + 2_399);
  assert.equal(trainer.bossCannonState.value, 'waiting');
  scheduler.advanceTo(firstOrbTime + 2_400);
  assert.equal(trainer.bossCannonState.value, 'telegraph');
});

test('player multiplication rotates only the C gap, then high precision resolves from the boss', () => {
  const { scheduler, trainer } = createTrainer();
  advanceThroughSecondOrb(scheduler, trainer);
  const originalFacing = -180;
  trainer.setPlayerFacingAngle(originalFacing);
  const secondOrbTime = SECOND_ORB_TIME;
  scheduler.advanceTo(secondOrbTime);
  assert.equal(trainer.playerRotationState.value, 'playing');
  assert.equal(trainer.playerGapRotationDegrees.value, 0);
  assert.equal(trainer.playerFacingAngle.value, originalFacing);
  assert.deepEqual(trainer.orbAnalysisResults.value.map(result => result.gapRotationDegrees), [0, 0]);

  scheduler.advanceTo(secondOrbTime + COMPOSITE_TIMING.playerRotationResolveMs);
  assert.equal(trainer.playerRotationState.value, 'applied');
  assert.equal(trainer.playerGapRotationDegrees.value, 90);
  assert.equal(trainer.playerFacingAngle.value, originalFacing);
  assert.equal(trainer.phase.value, 'high-precision');

  scheduler.advanceTo(
    secondOrbTime
      + COMPOSITE_TIMING.playerRotationResolveMs
      + COMPOSITE_TIMING.highPrecisionDelayMs
  );
  assert.equal(trainer.phase.value, 'resolved');
  assert.equal(trainer.highPrecisionResult.value.source, 'boss-high-precision');
  assert.deepEqual(trainer.highPrecisionResult.value.sourcePosition, { x: 2.5, y: 2.5 });
  assert.equal(trainer.highPrecisionResult.value.gapRotationDegrees, 90);
  assert.equal(trainer.highPrecisionResult.value.succeeded, true);
  assert.equal(trainer.analysisResults.value.length, 3);
  assert.equal(trainer.completedAllChecks.value, true);
  assert.equal(trainer.succeeded.value, true);
  assert.equal(trainer.successes.value, 1);
});

test('high precision uses the rotated gap and kills without changing player facing', () => {
  const { scheduler, trainer } = createTrainer();
  advanceThroughSecondOrb(scheduler, trainer);
  const facingBeforeRotation = 0;
  trainer.setPlayerFacingAngle(facingBeforeRotation);

  scheduler.advanceTo(SECOND_ORB_TIME + COMPOSITE_TIMING.playerRotationResolveMs);
  assert.equal(trainer.playerGapRotationDegrees.value, 90);
  assert.equal(trainer.playerFacingAngle.value, facingBeforeRotation);
  scheduler.advanceTo(
    SECOND_ORB_TIME
      + COMPOSITE_TIMING.playerRotationResolveMs
      + COMPOSITE_TIMING.highPrecisionDelayMs
  );

  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.deathRecord.value.event, 'high-precision');
  assert.deepEqual(trainer.deathRecord.value.sourcePosition, { x: 2.5, y: 2.5 });
  assert.equal(trainer.deathRecord.value.gapCenterAngle, 90);
  assert.equal(Math.abs(trainer.deathRecord.value.angleDifference), 180);
});

test('camera projection round trips without changing floor or analysis collision', () => {
  const player = { x: 2.7, y: 2.5 };
  const source = { x: 1.5, y: 4.5 };
  const dangerous = [{ row: 2, col: 2 }];
  const originalFloorHit = isPointInDangerousCells(player, dangerous);
  const originalAnalysisHit = isAttackInAnalysisGap(player, -149, 'front', source);

  for (const cameraRotation of [37, 90, 213]) {
    const screenPoint = worldPointToCameraPoint(player, cameraRotation);
    const recoveredWorldPoint = cameraPointToWorldPoint(screenPoint, cameraRotation);
    assert.ok(Math.abs(recoveredWorldPoint.x - player.x) < 1e-9);
    assert.ok(Math.abs(recoveredWorldPoint.y - player.y) < 1e-9);
    assert.equal(isPointInDangerousCells(recoveredWorldPoint, dangerous), originalFloorHit);
    assert.equal(
      isAttackInAnalysisGap(recoveredWorldPoint, -149, 'front', source),
      originalAnalysisHit
    );
  }
});

test('retry preserves the question, clears death, resets controls, and starts a clean timeline', () => {
  const { scheduler, trainer } = createTrainer();
  const question = {
    orientation: trainer.orientation.value,
    orbOrder: trainer.orbOrder.value,
    routeVariant: trainer.routeVariant.value,
    debuff: trainer.analysisDebuff.value,
    boss: { ...trainer.bossQuestion.value },
    player: { ...trainer.playerRotationCue.value }
  };
  trainer.start();
  scheduler.advanceTo(FIRST_ACTIVATION_MS);
  trainer.setPlayerPosition({ x: 0.5, y: 4.5 });
  assert.equal(trainer.phase.value, 'dead');
  const resetKey = trainer.cameraResetKey.value;

  trainer.retry();
  assert.equal(trainer.phase.value, 'analysis-lead');
  assert.equal(trainer.deathRecord.value, null);
  assert.equal(trainer.currentStep.value, -1);
  assert.deepEqual(trainer.dangerousCells.value, []);
  assert.deepEqual(trainer.playerPosition.value, LALARU_PLAYER_START);
  assert.equal(trainer.playerFacingAngle.value, 0);
  assert.equal(trainer.cameraResetKey.value, resetKey + 1);
  assert.deepEqual({
    orientation: trainer.orientation.value,
    orbOrder: trainer.orbOrder.value,
    routeVariant: trainer.routeVariant.value,
    debuff: trainer.analysisDebuff.value,
    boss: { ...trainer.bossQuestion.value },
    player: { ...trainer.playerRotationCue.value }
  }, question);
  assert.equal(trainer.activeTimerCount(), 1);
});

test('next question clears all prior damage state and stale scheduled events', () => {
  const scheduler = new FakeScheduler();
  const trainer = useLalaRuCompositeTrainer({
    scheduler,
    initialOrientation: 'north-south',
    initialOrbOrder: 'upper-first',
    initialRouteVariant: 'primary',
    initialAnalysisDebuff: 'front',
    orientationFactory: () => 'east-west',
    orbOrderFactory: () => 'lower-first',
    routeVariantFactory: () => 'mirrored',
    analysisDebuffFactory: () => 'right'
  });
  trainer.start();
  scheduler.advanceTo(FIRST_ACTIVATION_MS);
  trainer.setPlayerPosition({ x: 0.5, y: 4.5 });
  assert.equal(trainer.phase.value, 'dead');

  trainer.nextQuestion();
  assert.equal(trainer.phase.value, 'idle');
  assert.equal(trainer.deathRecord.value, null);
  assert.equal(trainer.hasFailed.value, false);
  assert.deepEqual(trainer.dangerousCells.value, []);
  assert.deepEqual(trainer.orbAnalysisResults.value, []);
  assert.equal(trainer.orientation.value, 'east-west');
  assert.equal(trainer.orbOrder.value, 'lower-first');
  assert.equal(trainer.routeVariant.value, 'mirrored');
  assert.equal(trainer.analysisDebuff.value, 'right');
  assert.equal(trainer.activeTimerCount(), 0);
  scheduler.advanceTo(60_000);
  assert.equal(trainer.phase.value, 'idle');
  assert.equal(trainer.deathRecord.value, null);
});

test('boss and player multiplication questions are independent and refresh independently', () => {
  const scheduler = new FakeScheduler();
  const trainer = useLalaRuCompositeTrainer({
    scheduler,
    initialOrientation: 'north-south',
    initialOrbOrder: 'upper-first',
    initialRouteVariant: 'primary',
    initialAnalysisDebuff: 'front',
    initialBossQuestion: {
      initialSafeDirection: 'north', arrowSide: 'left', multiplier: 'V', dotPattern: 5
    },
    initialPlayerRotationCue: { arrowSide: 'right', multiplier: 'III', dotPattern: 5 },
    bossQuestionFactory: () => ({
      initialSafeDirection: 'west', arrowSide: 'right', multiplier: 'V', dotPattern: 5
    }),
    playerRotationCueFactory: () => ({ arrowSide: 'left', multiplier: 'III', dotPattern: 5 })
  });

  trainer.nextQuestion();
  assert.deepEqual(trainer.bossQuestion.value, {
    initialSafeDirection: 'west', arrowSide: 'right', multiplier: 'V', dotPattern: 5
  });
  assert.deepEqual(trainer.playerRotationCue.value, {
    arrowSide: 'left', multiplier: 'III', dotPattern: 5
  });
  assert.notEqual(trainer.bossQuestion.value.multiplier, trainer.playerRotationCue.value.multiplier);
});

test('tutorial pause, single-step, replay, and disposal clear stale callbacks', () => {
  const scheduler = new FakeScheduler();
  const scope = effectScope();
  let trainer;
  scope.run(() => { trainer = useLalaRuCompositeTrainer({ scheduler }); });

  trainer.start();
  trainer.togglePause();
  assert.equal(trainer.paused.value, true);
  assert.equal(scheduler.tasks.size, 0);
  trainer.stepForward();
  assert.equal(trainer.currentStep.value, -1);
  assert.equal(trainer.phase.value, 'preview');
  trainer.stepForward();
  assert.equal(trainer.currentStep.value, 0);
  assert.equal(trainer.paused.value, true);

  trainer.replay();
  assert.equal(trainer.phase.value, 'analysis-lead');
  assert.equal(trainer.currentStep.value, -1);
  assert.equal(scheduler.tasks.size, 1);
  scope.stop();
  assert.equal(scheduler.tasks.size, 0);
});

test('resume preserves the remaining time in the paused preview segment', () => {
  const { scheduler, trainer } = createTrainer();
  trainer.start();
  scheduler.advanceTo(PATTERN_T0_MS + 1_200);
  trainer.togglePause();
  trainer.togglePause();
  assert.equal(trainer.nextStepInMs.value, 1_800);
  scheduler.advanceTo(FIRST_ACTIVATION_MS - 1);
  assert.equal(trainer.currentStep.value, -1);
  scheduler.advanceTo(FIRST_ACTIVATION_MS);
  assert.equal(trainer.currentStep.value, 0);
});

test('the next question randomizes orientation, orb order, and mirrored route variant', () => {
  const scheduler = new FakeScheduler();
  const trainer = useLalaRuCompositeTrainer({
    scheduler,
    initialOrientation: 'north-south',
    initialOrbOrder: 'upper-first',
    initialRouteVariant: 'primary',
    orientationFactory: () => 'east-west',
    orbOrderFactory: () => 'lower-first',
    routeVariantFactory: () => 'mirrored',
    initialAnalysisDebuff: 'front',
    analysisDebuffFactory: () => 'right'
  });
  trainer.start();
  scheduler.advanceTo(FIRST_ACTIVATION_MS + COMPOSITE_TIMING.stepIntervalMs);
  trainer.nextQuestion();
  assert.equal(trainer.orientation.value, 'east-west');
  assert.equal(trainer.orbOrder.value, 'lower-first');
  assert.equal(trainer.routeVariant.value, 'mirrored');
  assert.equal(trainer.analysisDebuff.value, 'right');
  assert.equal(trainer.phase.value, 'idle');
  assert.equal(trainer.currentStep.value, -1);
  assert.equal(trainer.explosionCount.value, 0);
  assert.equal(trainer.orbAnalysisResults.value.length, 0);
  assert.equal(scheduler.tasks.size, 0);
});
