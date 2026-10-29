import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANAR_GAPS,
  PLANAR_RESOLUTION_TIMING,
  analysisRotationOffsetDegrees,
  firstSegmentMineCellIntersection,
  planarAssignedPositions,
  planarExpectedFinalFacing,
  planarExpectedInitialFacing,
  simulatePlanarMinesResolution
} from '../../src/mechanics/lalaru/index.ts';
import { useLalaRuPlanarMinesTrainer } from '../../src/composables/useLalaRuPlanarMinesTrainer.ts';

const ids = ['you', 'npc-a', 'npc-b', 'npc-c'];

function question(gap = 'south-west', targets = ['you', 'npc-b']) {
  const layers = [1, 2, 2, 3];
  return {
    gap,
    party: ids.map((id, index) => ({
      id,
      layer: layers[index],
      multiplier: index % 2 ? 'V' : 'III',
      arrowSide: index < 2 ? 'left' : 'right',
      movement: 'forward',
      movementDurationSeconds: 16,
      explosionTarget: targets.includes(id),
      twoSlotOrder: index / 10
    }))
  };
}

function planarTruthTableQuestion({ gap, layers, targets, arrowSide, multiplier }) {
  return {
    gap,
    party: ids.map((id, index) => ({
      id,
      layer: layers[index],
      multiplier: id === 'you' ? multiplier : 'III',
      arrowSide: id === 'you' ? arrowSide : 'left',
      movement: 'forward',
      movementDurationSeconds: 16,
      explosionTarget: targets.includes(id),
      twoSlotOrder: index / 10
    }))
  };
}

function normalizeAngle(angle) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

function correctActors(value, strategy) {
  return planarAssignedPositions(value, strategy).map(assignment => ({
    id: assignment.member.id,
    position: { ...assignment.worldPosition },
    facingAngle: planarExpectedFinalFacing(assignment, value, strategy),
    layer: assignment.member.layer,
    explosionTarget: assignment.member.explosionTarget
  }));
}

test('mine triggering uses the complete square cell instead of a small center circle', () => {
  const center = { x: 2.5, y: 2.5 };
  assert.notEqual(
    firstSegmentMineCellIntersection({ x: 1.5, y: 2.91 }, { x: 3.5, y: 2.91 }, center),
    null,
    'a path through the outer portion of the visible cell still triggers it'
  );
  assert.equal(
    firstSegmentMineCellIntersection({ x: 1.5, y: 3.01 }, { x: 3.5, y: 3.01 }, center),
    null,
    'a path outside the visible cell does not trigger it'
  );
});

test('all four gaps and both strategies clear eight mines with 1/2/2/3 sequential hits', () => {
  for (const gap of PLANAR_GAPS) {
    for (const strategy of ['gap-bottom-left', 'gap-bottom-right']) {
      const value = question(gap);
      const result = simulatePlanarMinesResolution(value, strategy, correctActors(value, strategy));
      assert.equal(result.success, true, `${gap} ${strategy}`);
      assert.equal(result.mineEvents.length, 8);
      assert.equal(result.allMinesTriggered, true);
      assert.deepEqual(result.actorResults.map(actor => actor.triggeredMineCount).sort(), [1, 2, 2, 3]);
      assert.ok(result.actorResults.every(actor => actor.remainingLayer === 0));
      const three = result.actorResults.find(actor => actor.initialLayer === 3);
      const threeEvents = result.mineEvents.filter(event => event.affectedActorIds.includes(three.id));
      assert.equal(threeEvents.length, 3);
      assert.ok(threeEvents[0].atMs < threeEvents[1].atMs && threeEvents[1].atMs < threeEvents[2].atMs);
    }
  }
});

test('every pair of explosion targets is assigned into two valid two-person stacks', () => {
  for (let first = 0; first < ids.length; first += 1) {
    for (let second = first + 1; second < ids.length; second += 1) {
      const value = question('north-east', [ids[first], ids[second]]);
      const result = simulatePlanarMinesResolution(
        value,
        'gap-bottom-right',
        correctActors(value, 'gap-bottom-right')
      );
      assert.equal(result.stackSucceeded, true, `${ids[first]} + ${ids[second]}`);
      assert.deepEqual(result.stackChecks.map(check => check.participantIds.length), [2, 2]);
    }
  }
});

test('wrong final facing follows the real path, misses a mine, and preserves a layer', () => {
  const value = question();
  const actors = correctActors(value, 'gap-bottom-left');
  const player = actors.find(actor => actor.id === 'you');
  player.facingAngle += 90;
  const result = simulatePlanarMinesResolution(value, 'gap-bottom-left', actors);
  assert.equal(result.success, false);
  assert.equal(result.failureCode, 'wrong-direction');
  assert.equal(result.actorResults.find(actor => actor.id === 'you').triggeredMineCount, 0);
  assert.equal(result.actorResults.find(actor => actor.id === 'you').remainingLayer, 1);
  assert.equal(result.mineEvents.length, 7);
});

test('offset starts use the actual swept path instead of the expected slot or endpoint only', () => {
  const value = question();
  const actors = correctActors(value, 'gap-bottom-left');
  const player = actors.find(actor => actor.id === 'you');
  player.position = { x: player.position.x, y: player.position.y + 0.8 };
  const result = simulatePlanarMinesResolution(value, 'gap-bottom-left', actors);
  assert.equal(result.success, false);
  assert.equal(result.failureCode, 'wrong-start');
  assert.equal(result.actorResults.find(actor => actor.id === 'you').remainingLayer, 1);
});

test('double impact is resolved from final positions and detects a solo stack', () => {
  const value = question();
  const assignments = planarAssignedPositions(value, 'gap-bottom-left');
  const actors = correctActors(value, 'gap-bottom-left');
  const middleId = assignments.find(assignment => assignment.slot === 'two-middle').member.id;
  actors.find(actor => actor.id === middleId).position.x -= 0.7;
  const result = simulatePlanarMinesResolution(value, 'gap-bottom-left', actors);
  assert.equal(result.allMinesTriggered, true);
  assert.ok(result.actorResults.every(actor => actor.remainingLayer === 0));
  assert.equal(result.failureCode, 'stack-solo');
  assert.equal(result.stackChecks.find(check => check.targetId === 'you').participantIds.length, 1);
});

test('overlapping both double-impact targets detects repeated magical damage', () => {
  const value = question();
  const assignments = planarAssignedPositions(value, 'gap-bottom-left');
  const actors = correctActors(value, 'gap-bottom-left');
  const sidePairIds = assignments
    .filter(assignment => assignment.slot === 'one-side' || assignment.slot === 'two-middle')
    .map(assignment => assignment.member.id);
  for (const actor of actors) actor.explosionTarget = sidePairIds.includes(actor.id);
  const result = simulatePlanarMinesResolution(value, 'gap-bottom-left', actors);
  assert.equal(result.failureCode, 'stack-double-hit');
  assert.deepEqual([...result.doubleHitActorIds].sort(), [...sidePairIds].sort());
});

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

function prepareCorrectPlayer(trainer, value, strategy = 'gap-bottom-left') {
  const assignment = planarAssignedPositions(value, strategy).find(item => item.member.id === 'you');
  const offset = analysisRotationOffsetDegrees(assignment.member.arrowSide, assignment.member.multiplier);
  trainer.setPlayerPosition(assignment.worldPosition);
  trainer.setPlayerFacingAngle(planarExpectedInitialFacing(assignment, value, strategy, offset));
}

test('full animation moves actors over time, updates mines per event, then stacks at movement end', () => {
  const scheduler = new FakeScheduler();
  const value = question();
  const trainer = useLalaRuPlanarMinesTrainer({ scheduler, questionFactory: () => structuredClone(value) });
  trainer.start();
  prepareCorrectPlayer(trainer, value);
  const start = { ...trainer.playerPosition.value };

  scheduler.advanceTo(16_000);
  assert.equal(trainer.phase.value, 'forced-movement');
  assert.deepEqual(trainer.playerPosition.value, start);
  assert.equal(trainer.canOperate.value, false);

  scheduler.advanceTo(19_000);
  assert.notDeepEqual(trainer.playerPosition.value, start, 'the player is animated rather than teleported');
  assert.ok(trainer.triggeredMineKeys.value.length > 0);
  assert.ok(trainer.triggeredMineKeys.value.length < 8);

  scheduler.advanceTo(16_000 + PLANAR_RESOLUTION_TIMING.forcedMoveDurationMs);
  assert.equal(trainer.phase.value, 'stack-resolving');
  assert.equal(trainer.triggeredMineKeys.value.length, 8);
  assert.equal(trainer.stackResolvingTargetIds.value.length, 2);

  scheduler.advanceTo(16_000 + PLANAR_RESOLUTION_TIMING.doubleImpactAtMs
    + PLANAR_RESOLUTION_TIMING.doubleImpactDurationMs);
  assert.equal(trainer.phase.value, 'resolved');
  assert.equal(trainer.succeeded.value, true);
});

test('verified rotations produce the intended forced path across slots, gaps, and both strategies', () => {
  const cases = [
    {
      gap: 'south-west', strategy: 'gap-bottom-left', layers: [1, 2, 2, 3],
      targets: ['you', 'npc-b'], arrowSide: 'left', multiplier: 'III', rotation: -90,
      expectedSlot: 'one-side'
    },
    {
      gap: 'north-east', strategy: 'gap-bottom-right', layers: [3, 2, 2, 1],
      targets: ['you', 'npc-b'], arrowSide: 'left', multiplier: 'V', rotation: 90,
      expectedSlot: 'three-bottom'
    },
    {
      gap: 'north-west', strategy: 'gap-bottom-left', layers: [2, 1, 2, 3],
      targets: ['you', 'npc-b'], arrowSide: 'right', multiplier: 'III', rotation: 90,
      expectedSlot: 'two-middle'
    },
    {
      gap: 'south-east', strategy: 'gap-bottom-right', layers: [2, 1, 2, 3],
      targets: ['npc-b', 'npc-c'], arrowSide: 'right', multiplier: 'V', rotation: -90,
      expectedSlot: 'two-upper'
    }
  ];

  for (const testCase of cases) {
    const scheduler = new FakeScheduler();
    const value = planarTruthTableQuestion(testCase);
    const trainer = useLalaRuPlanarMinesTrainer({
      scheduler,
      questionFactory: () => structuredClone(value)
    });
    trainer.setShowResolutionAnimation(false);
    trainer.setStrategy(testCase.strategy);
    trainer.start();

    const assignment = planarAssignedPositions(value, testCase.strategy)
      .find(item => item.member.id === 'you');
    const finalFacing = planarExpectedFinalFacing(assignment, value, testCase.strategy);
    const preFacing = normalizeAngle(finalFacing - testCase.rotation);
    assert.equal(assignment.slot, testCase.expectedSlot);
    assert.equal(
      analysisRotationOffsetDegrees(testCase.arrowSide, testCase.multiplier),
      testCase.rotation
    );

    trainer.setPlayerPosition(assignment.worldPosition);
    trainer.setPlayerFacingAngle(preFacing);
    scheduler.advanceTo(16_000);

    assert.equal(trainer.playerFacingAngle.value, finalFacing);
    assert.equal(trainer.resolutionResult.value.paths.find(path => path.id === 'you').facingAngle, finalFacing);
    assert.equal(trainer.resolutionResult.value.success, true);
    assert.equal(trainer.phase.value, 'resolved');
  }
});

test('planar movement rejects the facing opposite the verified pre-rotation answer', () => {
  const testCase = {
    gap: 'north-west', strategy: 'gap-bottom-left', layers: [2, 1, 2, 3],
    targets: ['you', 'npc-b'], arrowSide: 'right', multiplier: 'III', rotation: 90
  };
  const scheduler = new FakeScheduler();
  const value = planarTruthTableQuestion(testCase);
  const trainer = useLalaRuPlanarMinesTrainer({
    scheduler,
    questionFactory: () => structuredClone(value)
  });
  trainer.setShowResolutionAnimation(false);
  trainer.start();
  const assignment = planarAssignedPositions(value, testCase.strategy)
    .find(item => item.member.id === 'you');
  const finalFacing = planarExpectedFinalFacing(assignment, value, testCase.strategy);
  trainer.setPlayerPosition(assignment.worldPosition);
  trainer.setPlayerFacingAngle(finalFacing - testCase.rotation + 180);

  scheduler.advanceTo(16_000);

  assert.equal(trainer.resolutionResult.value.success, false);
  assert.equal(trainer.resolutionResult.value.failureCode, 'wrong-direction');
  assert.equal(trainer.phase.value, 'dead');
});

test('skipping animation and playing it use the identical mechanic result', () => {
  const value = question('north-west', ['npc-a', 'npc-c']);
  const animatedClock = new FakeScheduler();
  const directClock = new FakeScheduler();
  const animated = useLalaRuPlanarMinesTrainer({ scheduler: animatedClock, questionFactory: () => structuredClone(value) });
  const direct = useLalaRuPlanarMinesTrainer({ scheduler: directClock, questionFactory: () => structuredClone(value) });
  direct.setShowResolutionAnimation(false);
  animated.start();
  direct.start();
  prepareCorrectPlayer(animated, value);
  prepareCorrectPlayer(direct, value);

  animatedClock.advanceTo(16_000);
  directClock.advanceTo(16_000);
  assert.equal(direct.phase.value, 'resolved');
  assert.deepEqual(direct.resolutionResult.value, animated.resolutionResult.value);

  animatedClock.advanceTo(16_000 + PLANAR_RESOLUTION_TIMING.doubleImpactAtMs
    + PLANAR_RESOLUTION_TIMING.doubleImpactDurationMs);
  assert.equal(animated.phase.value, 'resolved');
  assert.deepEqual(animated.resolutionResult.value, direct.resolutionResult.value);
});

test('planar trainer accumulates successful clears and streaks across questions', () => {
  const scheduler = new FakeScheduler();
  const value = question();
  const trainer = useLalaRuPlanarMinesTrainer({ scheduler, questionFactory: () => structuredClone(value) });
  trainer.setShowResolutionAnimation(false);

  trainer.start();
  prepareCorrectPlayer(trainer, value);
  scheduler.advanceTo(16_000);
  assert.equal(trainer.round.value, 1);
  assert.equal(trainer.successes.value, 1);
  assert.equal(trainer.streak.value, 1);

  trainer.restart();
  assert.equal(trainer.round.value, 1, 'retrying the same question keeps its number');
  prepareCorrectPlayer(trainer, value);
  scheduler.advanceTo(32_000);
  assert.equal(trainer.successes.value, 2);
  assert.equal(trainer.streak.value, 2);

  trainer.nextQuestion();
  assert.equal(trainer.round.value, 2);
  trainer.start();
  scheduler.advanceTo(48_000);
  assert.equal(trainer.successes.value, 2, 'a failed answer does not increase successful clears');
  assert.equal(trainer.streak.value, 0, 'a failed answer resets the streak');
});

test('turning animation off during forced movement cancels replay and keeps the computed result', () => {
  const scheduler = new FakeScheduler();
  const value = question();
  const trainer = useLalaRuPlanarMinesTrainer({ scheduler, questionFactory: () => structuredClone(value) });
  trainer.start();
  prepareCorrectPlayer(trainer, value);
  scheduler.advanceTo(18_000);
  const computedResult = JSON.stringify(trainer.resolutionResult.value);

  trainer.setShowResolutionAnimation(false);
  assert.equal(trainer.phase.value, 'resolved');
  assert.equal(JSON.stringify(trainer.resolutionResult.value), computedResult);
  assert.equal(trainer.activeTimerCount(), 0);
  scheduler.advanceTo(40_000);
  assert.equal(trainer.phase.value, 'resolved');
});

test('direct settlement reports a specific death and locks manual controls', () => {
  const scheduler = new FakeScheduler();
  const value = question();
  const trainer = useLalaRuPlanarMinesTrainer({ scheduler, questionFactory: () => structuredClone(value) });
  trainer.setShowResolutionAnimation(false);
  trainer.start();
  scheduler.advanceTo(16_000);

  assert.equal(trainer.phase.value, 'dead');
  assert.equal(trainer.canOperate.value, false);
  assert.equal(trainer.deathDialogOpen.value, true);
  assert.notEqual(trainer.resolutionResult.value.failureCode, null);
  assert.notEqual(trainer.failureReason.value, '');
  const frozen = { ...trainer.playerPosition.value };
  trainer.setPlayerPosition({ x: 1, y: 1 });
  assert.deepEqual(trainer.playerPosition.value, frozen);
});

test('restart during resolution clears mines, layers, movement frames, and settlement state', () => {
  const scheduler = new FakeScheduler();
  const value = question();
  const trainer = useLalaRuPlanarMinesTrainer({ scheduler, questionFactory: () => structuredClone(value) });
  trainer.start();
  prepareCorrectPlayer(trainer, value);
  scheduler.advanceTo(18_000);
  assert.ok(trainer.triggeredMineKeys.value.length > 0);

  trainer.restart();
  assert.equal(trainer.phase.value, 'preparing');
  assert.equal(trainer.remainingSeconds.value, 16);
  assert.deepEqual(trainer.triggeredMineKeys.value, []);
  assert.deepEqual(trainer.explodingMineKeys.value, []);
  assert.equal(trainer.resolutionResult.value, null);
  assert.deepEqual([...new Set(Object.values(trainer.remainingLayers.value))].sort(), [1, 2, 3]);

  scheduler.advanceTo(20_000);
  assert.equal(trainer.phase.value, 'preparing', 'old movement and settlement callbacks were cancelled');
});
