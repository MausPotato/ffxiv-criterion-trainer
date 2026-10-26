import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANAR_GAPS,
  PLANAR_TIMELINE,
  assignPlanarSlots,
  generatePlanarMinesQuestion,
  planarAssignedPositions,
  planarGapCell,
  planarMineCells,
  strategyCameraRotationDegrees
} from '../../src/mechanics/lalaru/planar-mines.ts';
import { worldPointToCameraPoint } from '../../src/presentation/lalaru/camera.ts';
import { useLalaRuPlanarMinesTrainer } from '../../src/composables/useLalaRuPlanarMinesTrainer.ts';

const strategies = ['gap-bottom-left', 'gap-bottom-right'];

function closePoint(actual, expected) {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-9, `${actual.x} != ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) < 1e-9, `${actual.y} != ${expected.y}`);
}

function member(id, layer, explosionTarget, twoSlotOrder = 0) {
  return {
    id,
    layer,
    multiplier: 'III',
    arrowSide: 'left',
    movement: 'forward',
    movementDurationSeconds: 16,
    explosionTarget,
    twoSlotOrder
  };
}

test('all four gaps create exactly eight mines in the central 3x3', () => {
  for (const gap of PLANAR_GAPS) {
    const cells = planarMineCells(gap);
    const missing = planarGapCell(gap);
    assert.equal(cells.length, 8);
    assert.ok(cells.every(cell => cell.row >= 1 && cell.row <= 3 && cell.col >= 1 && cell.col <= 3));
    assert.ok(!cells.some(cell => cell.row === missing.row && cell.col === missing.col));
  }
});

test('four world gaps by two strategies align every NPC reference placement after camera rotation', () => {
  const party = [
    member('you', 3, false),
    member('npc-a', 2, true),
    member('npc-b', 2, false),
    member('npc-c', 1, true)
  ];
  for (const gap of PLANAR_GAPS) {
    for (const strategy of strategies) {
      const question = { gap, party };
      const rotation = strategyCameraRotationDegrees(gap, strategy);
      for (const assignment of planarAssignedPositions(question, strategy)) {
        closePoint(
          worldPointToCameraPoint(assignment.worldPosition, rotation),
          assignment.referencePosition
        );
      }
    }
  }
});

test('camera changes screen positions without mutating mine or NPC world coordinates', () => {
  const question = {
    gap: 'north-east',
    party: [
      member('you', 1, false),
      member('npc-a', 2, true),
      member('npc-b', 2, false),
      member('npc-c', 3, true)
    ]
  };
  const minesBefore = structuredClone(planarMineCells(question.gap));
  const assignments = planarAssignedPositions(question, 'gap-bottom-left');
  const worldBefore = structuredClone(assignments.map(item => item.worldPosition));
  for (const rotation of [-137, 0, 48, 180]) {
    assignments.map(item => worldPointToCameraPoint(item.worldPosition, rotation));
  }
  assert.deepEqual(planarMineCells(question.gap), minesBefore);
  assert.deepEqual(assignments.map(item => item.worldPosition), worldBefore);
});

test('generated debuffs always total eight layers and contain two explosion targets', () => {
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const question = generatePlanarMinesQuestion();
    assert.equal(question.party.reduce((sum, item) => sum + item.layer, 0), 8);
    assert.deepEqual([...question.party].map(item => item.layer).sort(), [1, 2, 2, 3]);
    assert.equal(question.party.filter(item => item.explosionTarget).length, 2);
    assert.ok(question.party.every(item => item.movement === 'forward'));
    assert.ok(question.party.every(item => item.movementDurationSeconds === 16));
    assert.ok(question.party.every(item => item.multiplier === 'III' || item.multiplier === 'V'));
    assert.ok(question.party.every(item => item.arrowSide === 'left' || item.arrowSide === 'right'));
  }
});

test('the two layer-two players exchange upper and middle slots with explosion assignment', () => {
  const base = [
    member('you', 1, false),
    member('npc-a', 2, true, .9),
    member('npc-b', 2, false, .1),
    member('npc-c', 3, true)
  ];
  const first = assignPlanarSlots(base);
  const swapped = assignPlanarSlots(base.map(item => item.layer === 2
    ? { ...item, explosionTarget: !item.explosionTarget }
    : item));
  assert.equal(first.get('npc-a'), 'two-middle');
  assert.equal(first.get('npc-b'), 'two-upper');
  assert.equal(swapped.get('npc-a'), 'two-upper');
  assert.equal(swapped.get('npc-b'), 'two-middle');
});

test('the lower two-layer and one-layer placements straddle their shared grid line', () => {
  const party = [
    member('you', 3, false), member('npc-a', 2, true),
    member('npc-b', 2, false), member('npc-c', 1, true)
  ];
  const positions = planarAssignedPositions({ gap: 'south-west', party }, 'gap-bottom-left');
  const middleTwo = positions.find(item => item.slot === 'two-middle').referencePosition;
  const one = positions.find(item => item.slot === 'one-side').referencePosition;
  assert.ok(middleTwo.y < 3 && one.y > 3);
  assert.ok(one.y - middleTwo.y < 1, 'the stack pair must be closer than adjacent cell centers');
});

test('the two paired with layer three waits farther outside than the one-plus-two pair', () => {
  const party = [
    member('you', 3, false), member('npc-a', 2, true),
    member('npc-b', 2, false), member('npc-c', 1, true)
  ];
  for (const strategy of strategies) {
    const positions = planarAssignedPositions({ gap: strategy === 'gap-bottom-left' ? 'south-west' : 'south-east', party }, strategy);
    const threePairTwo = positions.find(item => item.slot === 'two-upper').referencePosition;
    const onePairTwo = positions.find(item => item.slot === 'two-middle').referencePosition;
    assert.ok(Math.abs(threePairTwo.x - 2.5) > Math.abs(onePairTwo.x - 2.5));
  }
});

test('layer three uses the outer bottom column for both mirrored strategies', () => {
  const party = [
    member('you', 3, false), member('npc-a', 2, true),
    member('npc-b', 2, false), member('npc-c', 1, true)
  ];
  const left = planarAssignedPositions({ gap: 'south-west', party }, 'gap-bottom-left')
    .find(item => item.slot === 'three-bottom').referencePosition;
  const right = planarAssignedPositions({ gap: 'south-east', party }, 'gap-bottom-right')
    .find(item => item.slot === 'three-bottom').referencePosition;
  assert.deepEqual(left, { x: 3.5, y: 4.25 });
  assert.deepEqual(right, { x: 1.5, y: 4.25 });
});

test('video-derived planar events are centralized on the 16-second clock', () => {
  assert.equal(PLANAR_TIMELINE.durationMs, 16_000);
  assert.equal(PLANAR_TIMELINE.mineTelegraphRemainingMs, 15_000);
  assert.equal(PLANAR_TIMELINE.mineFullRemainingMs, 14_000);
  assert.equal(PLANAR_TIMELINE.rotationCueRemainingMs, 10_000);
  assert.equal(PLANAR_TIMELINE.rotationCountdownStartRemainingMs, 4_800);
  assert.equal(PLANAR_TIMELINE.rotationCountdownDots, 5);
});

test('NPC placement stays hidden until confirmation and resets for strategy or question changes', () => {
  const question = {
    gap: 'south-west',
    party: [
      member('you', 1, false), member('npc-a', 2, true),
      member('npc-b', 2, false), member('npc-c', 3, true)
    ]
  };
  const trainer = useLalaRuPlanarMinesTrainer({ questionFactory: () => structuredClone(question) });
  assert.equal(trainer.placementConfirmed.value, false);
  trainer.confirmPlacement();
  assert.equal(trainer.placementConfirmed.value, false, 'confirmation requires a selected player position');
  trainer.start();
  trainer.setPlayerPosition({ x: 1, y: 4 });
  trainer.confirmPlacement();
  assert.equal(trainer.placementConfirmed.value, true);
  trainer.setStrategy('gap-bottom-right');
  assert.equal(trainer.placementConfirmed.value, false);
  trainer.confirmPlacement();
  trainer.nextQuestion();
  assert.equal(trainer.placementSelected.value, false);
  assert.equal(trainer.placementConfirmed.value, false);
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

test('planar preparation reveals debuffs, mines, player cue, and five-dot countdown in order', () => {
  const scheduler = new FakeScheduler();
  const question = {
    gap: 'south-west',
    party: [
      member('you', 1, false), member('npc-a', 2, true),
      member('npc-b', 2, false), member('npc-c', 3, true)
    ]
  };
  const trainer = useLalaRuPlanarMinesTrainer({
    scheduler,
    questionFactory: () => structuredClone(question)
  });
  trainer.setPlayerPosition({ x: 1, y: 4 });
  assert.deepEqual(trainer.playerPosition.value, { x: 2.5, y: 3.7 }, 'movement is locked before the 16s window');
  trainer.start();
  assert.equal(trainer.debuffsVisible.value, true);
  assert.equal(trainer.mineRevealState.value, 'hidden');
  trainer.setPlayerPosition({ x: 1, y: 4 });
  trainer.setPlayerFacingAngle(20);

  scheduler.advanceTo(1_000);
  assert.equal(trainer.remainingSeconds.value, 15);
  assert.equal(trainer.mineRevealState.value, 'telegraph');
  scheduler.advanceTo(2_000);
  assert.equal(trainer.mineRevealState.value, 'full');
  scheduler.advanceTo(6_000);
  assert.equal(trainer.remainingSeconds.value, 10);
  assert.equal(trainer.rotationCueVisible.value, true);
  assert.equal(trainer.rotationDotCount.value, 0);
  scheduler.advanceTo(11_200);
  assert.equal(trainer.rotationDotCount.value, 5);
  scheduler.advanceTo(12_160);
  assert.equal(trainer.rotationDotCount.value, 4);
  scheduler.advanceTo(16_000);
  assert.equal(trainer.remainingSeconds.value, 0);
  assert.equal(trainer.phase.value, 'forced-movement');
  assert.equal(trainer.playerFacingAngle.value, 110, 'III reverses the left cue into a +90 degree result');
  assert.deepEqual(trainer.playerPosition.value, { x: 1, y: 4 }, 'forced movement remains intentionally unimplemented');
});

test('repeated start and next question cannot leave duplicate or stale timeline events', () => {
  const scheduler = new FakeScheduler();
  const question = {
    gap: 'north-east',
    party: [
      member('you', 2, false), member('npc-a', 1, true),
      member('npc-b', 2, true), member('npc-c', 3, false)
    ]
  };
  const trainer = useLalaRuPlanarMinesTrainer({
    scheduler,
    questionFactory: () => structuredClone(question)
  });
  trainer.start();
  const scheduledOnce = trainer.activeTimerCount();
  trainer.start();
  assert.equal(trainer.activeTimerCount(), scheduledOnce);
  trainer.nextQuestion();
  assert.equal(trainer.activeTimerCount(), 0);
  assert.equal(scheduler.tasks.size, 0);
  scheduler.advanceTo(30_000);
  assert.equal(trainer.phase.value, 'idle');
  assert.equal(trainer.mineRevealState.value, 'hidden');
  assert.equal(trainer.rotationCueVisible.value, false);
});

test('restart cancels the old timeline and reinitializes the same 16-second attempt', () => {
  const scheduler = new FakeScheduler();
  const question = {
    gap: 'north-west',
    party: [
      member('you', 3, true), member('npc-a', 1, false),
      member('npc-b', 2, true), member('npc-c', 2, false)
    ]
  };
  const trainer = useLalaRuPlanarMinesTrainer({
    scheduler,
    questionFactory: () => structuredClone(question)
  });

  trainer.start();
  const scheduledOnce = trainer.activeTimerCount();
  trainer.setPlayerPosition({ x: 1, y: 1 });
  trainer.setPlayerFacingAngle(73);
  scheduler.advanceTo(2_000);
  assert.equal(trainer.mineRevealState.value, 'full');

  trainer.restart();
  assert.equal(trainer.phase.value, 'preparing');
  assert.equal(trainer.remainingSeconds.value, 16);
  assert.equal(trainer.debuffsVisible.value, true);
  assert.equal(trainer.mineRevealState.value, 'hidden');
  assert.equal(trainer.rotationCueVisible.value, false);
  assert.equal(trainer.rotationDotCount.value, 0);
  assert.deepEqual(trainer.playerPosition.value, { x: 2.5, y: 3.7 });
  assert.equal(trainer.playerFacingAngle.value, 0);
  assert.deepEqual(trainer.question.value, question, 'restart keeps the same assignment');
  assert.equal(trainer.activeTimerCount(), scheduledOnce, 'old timers are cleared before scheduling again');

  scheduler.advanceTo(2_999);
  assert.equal(trainer.mineRevealState.value, 'hidden');
  scheduler.advanceTo(3_000);
  assert.equal(trainer.remainingSeconds.value, 15);
  assert.equal(trainer.mineRevealState.value, 'telegraph');
  scheduler.advanceTo(4_000);
  assert.equal(trainer.mineRevealState.value, 'full');
});
