import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS,
  SUMMONED_DOLLS_EVENTS,
  createFixedSummonedDollsScenario,
  createSummonedDollsConfiguration,
  createSummonedDollsScenario,
  createSummonedDollsShiftPlan,
  evaluateSummonedDollsEnumeration,
  lightBlastCellsFromSnapshot,
  rotateSummonedDollsCell,
  summonedDollsFloorAtEvent,
  summonedDollsStatusStateAtEvent
} from '../../src/mechanics/lalaru/index.ts';
import { useLalaRuSummonedDollsTrainer } from '../../src/composables/useLalaRuSummonedDollsTrainer.ts';
import {
  cameraPointToWorldPoint,
  worldPointToCameraPoint
} from '../../src/presentation/lalaru/camera.ts';

const effectCount = (cells, kind) => cells
  .filter(cell => cell.effects.some(effect => effect.kind === kind)).length;

function advanceUntil(trainer, eventId) {
  while (trainer.currentEvent.value?.id !== eventId && trainer.canAdvance.value) trainer.advance();
  assert.equal(trainer.currentEvent.value?.id, eventId);
}

function assertPointClose(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual.x - expected.x) <= epsilon);
  assert.ok(Math.abs(actual.y - expected.y) <= epsilon);
}

function advanceBattleToMagicBurstTargets(trainer) {
  trainer.setMode('battle');
  trainer.selectPlayer('tank');
  trainer.start();
  advanceUntil(trainer, 'spread-for-light-blast');
  trainer.setSelectedPlayerPosition(trainer.scenario.spreadPositions.tank);
  advanceUntil(trainer, 'shift-ready');
  trainer.advance();
  trainer.setSelectedPlayerPosition(trainer.shiftPlan.value.targetPositions.tank);
  advanceUntil(trainer, 'magic-burst-targets');
}

test('default fixture uses confirmed local lanes 2, 4, 5 and empty lanes 1, 3', () => {
  const configuration = createSummonedDollsConfiguration('north');
  assert.deepEqual(configuration.dollLanes, [1, 3, 4]);
  assert.deepEqual(configuration.safeLanes, [0, 2]);
  assert.equal(configuration.dolls.length, 3);
  assert.deepEqual(configuration.dolls.map(doll => doll.attackCells.length), [5, 5, 5]);
  assert.deepEqual(configuration.dolls.map(doll => doll.worldLane), [1, 3, 4]);
});

test('configuration accepts both confirmed patterns and rejects duplicate or out-of-bounds lanes', () => {
  assert.throws(() => createSummonedDollsConfiguration('north', [0, 0, 4]), /three unique lanes/);
  assert.throws(() => createSummonedDollsConfiguration('north', [1, 3, 5]), /three unique lanes/);
  assert.deepEqual(createSummonedDollsConfiguration('north', [0, 2, 4]).safeLanes, [1, 3]);
  assert.deepEqual(createSummonedDollsConfiguration('north', [1, 3, 4]).safeLanes, [0, 2]);
  assert.deepEqual(SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS, [[0, 2, 4], [1, 3, 4]]);
  assert.ok(!SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS.some(pattern =>
    pattern.join(',') === '0,1,3'));
  assert.deepEqual(createSummonedDollsConfiguration('north').dollLanes, [1, 3, 4]);
});

test('both confirmed patterns keep dolls and attack cells aligned on all four spawn sides', () => {
  assert.deepEqual(rotateSummonedDollsCell({ row: 0, col: 1 }, 'north'), { row: 0, col: 1 });
  assert.deepEqual(rotateSummonedDollsCell({ row: 0, col: 1 }, 'east'), { row: 1, col: 4 });

  for (const pattern of SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS) {
    for (const side of ['north', 'east', 'south', 'west']) {
      const configuration = createSummonedDollsConfiguration(side, pattern);
      assert.deepEqual(configuration.dollLanes, [...pattern]);
      assert.deepEqual(configuration.safeLanes,
        Array.from({ length: 5 }, (_, lane) => lane).filter(lane => !pattern.includes(lane)));
      for (const doll of configuration.dolls) {
        assert.equal(doll.attackCells.length, 5);
        assert.ok(doll.attackCells.every(cell =>
          cell.row >= 0 && cell.row < 5 && cell.col >= 0 && cell.col < 5));
        if (side === 'north' || side === 'south') {
          assert.ok(doll.attackCells.every(cell => cell.col === doll.worldLane));
          assert.equal(doll.position.x, doll.worldLane + .5);
        } else {
          assert.ok(doll.attackCells.every(cell => cell.row === doll.worldLane));
          assert.equal(doll.position.y, doll.worldLane + .5);
        }
      }

      const scenario = createFixedSummonedDollsScenario(side, pattern);
      const galeFloor = summonedDollsFloorAtEvent('gale-telegraph', scenario);
      const galeKeys = new Set(galeFloor
        .filter(cell => cell.effects.some(effect => effect.kind === 'aoe-telegraph'))
        .map(cell => `${cell.row}-${cell.col}`));
      const attackKeys = new Set(configuration.dolls
        .flatMap(doll => doll.attackCells)
        .map(cell => `${cell.row}-${cell.col}`));
      assert.deepEqual(galeKeys, attackKeys);
      assert.equal(effectCount(galeFloor, 'movement-safe'), 10);
    }
  }
});

test('formal scenario generation selects only confirmed north-side pattern combinations', () => {
  const values = [0, .99];
  let index = 0;
  const random = () => values[index++];
  const fixtures = Array.from({ length: 2 }, () => createSummonedDollsScenario(random));
  assert.deepEqual(fixtures.map(fixture => fixture.configuration.dollLanes), [
    [0, 2, 4], [1, 3, 4]
  ]);
  assert.ok(fixtures.every(fixture => fixture.configuration.dollSide === 'north'));
  assert.ok(fixtures.every(fixture => fixture.pattern.id === 'south-east-video-example'));
  assert.ok(fixtures.every(fixture => fixture.pattern.confirmedDollSides.includes('north')));
});

test('south-east video example defines two independent paths and one explicit turn', () => {
  const pattern = createFixedSummonedDollsScenario().pattern;
  assert.deepEqual(pattern.startCells, [{ row: 3, col: 4 }, { row: 4, col: 4 }]);
  assert.deepEqual(pattern.paths[0], {
    id: 'upper',
    initialFacing: 'north',
    cells: [
      { row: 3, col: 4 }, { row: 2, col: 4 }, { row: 1, col: 4 },
      { row: 1, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 }
    ],
    turns: [{ at: { row: 1, col: 4 }, from: 'north', to: 'west' }]
  });
  assert.deepEqual(pattern.paths[1], {
    id: 'lower',
    initialFacing: 'west',
    cells: [
      { row: 4, col: 4 }, { row: 4, col: 3 }, { row: 4, col: 2 },
      { row: 4, col: 1 }, { row: 4, col: 0 }
    ],
    turns: []
  });
  assert.equal(pattern.displayStepMs, 650);
  assert.equal(pattern.timingConfirmed, false);
});

test('every pattern step snapshot retains traversed cells and advances both paths independently', () => {
  const pattern = createFixedSummonedDollsScenario().pattern;
  assert.equal(pattern.stepSnapshots.length, 7);
  assert.deepEqual(pattern.stepSnapshots.map(snapshot => snapshot.activeCells), [
    [{ row: 3, col: 4 }, { row: 4, col: 4 }],
    [{ row: 2, col: 4 }, { row: 4, col: 3 }],
    [{ row: 1, col: 4 }, { row: 4, col: 2 }],
    [{ row: 1, col: 3 }, { row: 4, col: 1 }],
    [{ row: 1, col: 2 }, { row: 4, col: 0 }],
    [{ row: 1, col: 1 }],
    [{ row: 1, col: 0 }]
  ]);
  assert.deepEqual(pattern.stepSnapshots.map(snapshot => snapshot.traversedCells.length),
    [2, 4, 6, 8, 10, 11, 12]);
});

test('each step renders prior cells as danger and current cells as an independent pattern source', () => {
  const scenario = createFixedSummonedDollsScenario();
  for (let index = 1; index < scenario.pattern.stepSnapshots.length; index += 1) {
    const snapshot = scenario.pattern.stepSnapshots[index];
    const floor = summonedDollsFloorAtEvent('changing-pattern-step', scenario, null, index);
    assert.equal(effectCount(floor, 'pattern-step'), snapshot.activeCells.length);
    assert.equal(
      effectCount(floor, 'pattern-danger'),
      snapshot.traversedCells.length - snapshot.activeCells.length
    );
    assert.ok(floor.some(cell => cell.effects.some(effect => effect.source === 'gale')));
    assert.ok(floor.some(cell => cell.effects.some(effect => effect.source === 'changing-pattern')));
  }
});

test('final pattern is the exact 12-cell perimeter path and survives camera round trips', () => {
  const scenario = createFixedSummonedDollsScenario();
  const expected = new Set([
    '1-0', '1-1', '1-2', '1-3', '1-4',
    '2-4', '3-4',
    '4-0', '4-1', '4-2', '4-3', '4-4'
  ]);
  assert.deepEqual(new Set(scenario.pattern.finalCells.map(cell => `${cell.row}-${cell.col}`)), expected);

  for (const rotation of [0, 90, 180, -90]) {
    for (const cell of scenario.pattern.finalCells) {
      const worldPoint = { x: cell.col + .5, y: cell.row + .5 };
      const displayed = worldPointToCameraPoint(worldPoint, rotation);
      assertPointClose(cameraPointToWorldPoint(displayed, rotation), worldPoint);
    }
  }
});

test('floor snapshots keep simultaneous mechanic sources instead of one safe boolean', () => {
  const scenario = createFixedSummonedDollsScenario();
  const idle = summonedDollsFloorAtEvent(null, scenario);
  const gale = summonedDollsFloorAtEvent('gale-telegraph', scenario);
  const starts = summonedDollsFloorAtEvent('changing-pattern-starts', scenario);
  const finalPattern = summonedDollsFloorAtEvent('changing-pattern-final', scenario);

  assert.equal(idle.length, 25);
  assert.ok(idle.every(cell => cell.state === 'normal' && cell.effects.length === 0));
  assert.equal(effectCount(gale, 'aoe-telegraph'), 15);
  assert.equal(effectCount(gale, 'movement-safe'), 10);
  assert.equal(effectCount(starts, 'pattern-step'), 2);
  assert.ok(starts.some(cell => cell.effects.length > 1));
  assert.equal(effectCount(finalPattern, 'pattern-danger'), 12);
  assert.equal(effectCount(finalPattern, 'movement-safe'), 6);
  assert.equal(scenario.pattern.finalCells.length, 12);
  assert.equal(scenario.pattern.routeConfirmed, true);
  assert.equal(scenario.pattern.timingConfirmed, false);
});

test('the 12-cell path leaves interior cells safe and derives four distinct showcase positions', () => {
  for (const pattern of SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS) {
    const scenario = createFixedSummonedDollsScenario('north', pattern);
    const floor = summonedDollsFloorAtEvent('changing-pattern-final', scenario);
    const dangerKeys = new Set(floor
      .filter(cell => cell.effects.some(effect => effect.kind === 'pattern-danger'))
      .map(cell => `${cell.row}-${cell.col}`));
    assert.equal(dangerKeys.size, 12);
    for (const safeKey of ['0-0', '0-4', '2-0', '2-2', '3-1', '3-3']) {
      assert.equal(dangerKeys.has(safeKey), false, `${safeKey} must not be filled by the bounding rectangle`);
    }
    const positions = Object.values(scenario.spreadPositions);
    assert.equal(new Set(positions.map(position => `${position.x}-${position.y}`)).size, 4);
    for (const position of positions) {
      const cell = floor.find(candidate =>
        candidate.row === Math.floor(position.y) && candidate.col === Math.floor(position.x));
      assert.equal(cell.state, 'movement-safe');
    }
  }
});

test('light blast creates lethal cells only after snapshot, impact, and floor conversion events', () => {
  const scenario = createFixedSummonedDollsScenario();
  const snapshot = {
    tank: { x: .4, y: .4 },
    healer: { x: 4.4, y: .4 },
    'dps-melee': { x: .4, y: 4.4 },
    'dps-ranged': { x: 4.4, y: 4.4 }
  };
  assert.deepEqual(lightBlastCellsFromSnapshot(snapshot), [
    { row: 0, col: 0 }, { row: 0, col: 4 }, { row: 4, col: 0 }, { row: 4, col: 4 }
  ]);

  for (const eventId of [
    'light-blast-markers',
    'spread-for-light-blast',
    'light-blast-snapshot',
    'light-blast-impact',
    'gale-impact'
  ]) {
    assert.equal(effectCount(summonedDollsFloorAtEvent(eventId, scenario, snapshot), 'light-blast-lethal'), 0);
  }
  const converted = summonedDollsFloorAtEvent('light-blast-floor', scenario, snapshot);
  assert.equal(effectCount(converted, 'light-blast-lethal'), 4);
  assert.ok(converted.filter(cell => cell.state === 'light-blast-lethal')
    .every(cell => cell.effects.some(effect => effect.source === 'light-blast')));
});

test('status data models unknown duration, application, expiry, and final pair resolution', () => {
  const scenario = createFixedSummonedDollsScenario();
  const evenExplosion = scenario.statuses.find(status => status.id === 'even-explosion-target');
  const vulnerability = scenario.statuses.find(status => status.id === 'magic-vulnerability-up');

  assert.deepEqual(evenExplosion.targetIds, ['dps-melee', 'dps-ranged']);
  assert.equal(evenExplosion.durationMs, null);
  assert.equal(evenExplosion.expiresAtEventId, 'enumeration-stack-resolved');
  assert.equal(evenExplosion.resolvesAtEventId, 'enumeration-stack-resolved');
  assert.deepEqual(evenExplosion.resolutionPairs, [
    { targetId: 'dps-melee', partnerId: 'tank' },
    { targetId: 'dps-ranged', partnerId: 'healer' }
  ]);
  assert.equal(summonedDollsStatusStateAtEvent(evenExplosion, null, scenario), 'pending');
  assert.equal(summonedDollsStatusStateAtEvent(evenExplosion, 'summon-dolls', scenario), 'active');
  assert.equal(summonedDollsStatusStateAtEvent(
    evenExplosion, 'enumeration-stack-resolved', scenario
  ), 'resolved');

  assert.deepEqual(vulnerability.targetIds, ['tank', 'healer', 'dps-melee', 'dps-ranged']);
  assert.equal(vulnerability.durationMs, null);
  assert.deepEqual(vulnerability.reappliedAtEventIds, ['magic-burst-vulnerability']);
  assert.equal(summonedDollsStatusStateAtEvent(vulnerability, 'light-blast-floor', scenario), 'pending');
  assert.equal(summonedDollsStatusStateAtEvent(vulnerability, 'magic-vulnerability', scenario), 'active');
});

test('first-phase events separate cast, starts, steps, snapshot, impacts, floor conversion, and debuff', () => {
  const scenario = createFixedSummonedDollsScenario();
  assert.deepEqual(scenario.implementedEventIds, [
    'even-explosion-status',
    'summon-dolls',
    'gale-telegraph',
    'changing-pattern-cast',
    'changing-pattern-starts',
    'changing-pattern-step',
    'changing-pattern-final',
    'light-blast-markers',
    'spread-for-light-blast',
    'light-blast-snapshot',
    'light-blast-impact',
    'gale-impact',
    'light-blast-floor',
    'magic-vulnerability',
    'prepare-shift',
    'shift-ready',
    'shift-to-former-aoe',
    'shift-complete',
    'prepare-magic-burst',
    'magic-burst-cast',
    'magic-burst-targets',
    'magic-burst-positioning',
    'magic-burst-snapshot',
    'magic-burst-first-impact',
    'magic-burst-vulnerability',
    'magic-burst-second-telegraph',
    'magic-burst-evacuation',
    'enumeration-stack-ready',
    'magic-burst-second-impact',
    'enumeration-stack-snapshot',
    'enumeration-stack-impact',
    'enumeration-stack-resolved',
    'mechanic-finished'
  ]);
  assert.deepEqual(SUMMONED_DOLLS_EVENTS.filter(event => !event.implemented).map(event => event.id), []);
  assert.deepEqual(scenario.firstResolution.sources, ['light-blast', 'gale']);
  assert.equal(scenario.firstResolution.relativeOrderConfirmed, false);
  assert.ok(scenario.events.every(event => event.timingConfirmed === false));
});

test('both doll configurations derive four distinct outer placement and stack-preparation positions', () => {
  const fixtures = [
    {
      pattern: [0, 2, 4],
      placement: {
        tank: { x: .16, y: 2.16 },
        'dps-melee': { x: .16, y: 3.84 },
        healer: { x: 2.84, y: 2.16 },
        'dps-ranged': { x: 2.84, y: 3.84 }
      },
      preparation: {
        tank: { x: .62, y: 2.9 },
        'dps-melee': { x: .82, y: 3.1 },
        healer: { x: 2.18, y: 2.9 },
        'dps-ranged': { x: 2.38, y: 3.1 }
      }
    },
    {
      pattern: [1, 3, 4],
      placement: {
        tank: { x: 1.16, y: 2.16 },
        'dps-melee': { x: 1.16, y: 3.84 },
        healer: { x: 3.84, y: 2.16 },
        'dps-ranged': { x: 3.84, y: 3.84 }
      },
      preparation: {
        tank: { x: 1.62, y: 2.9 },
        'dps-melee': { x: 1.82, y: 3.1 },
        healer: { x: 3.18, y: 2.9 },
        'dps-ranged': { x: 3.38, y: 3.1 }
      }
    }
  ];

  for (const fixture of fixtures) {
    const scenario = createFixedSummonedDollsScenario('north', fixture.pattern);
    assert.deepEqual(scenario.magicBurst.placementPositions, fixture.placement);
    assert.deepEqual(scenario.magicBurst.enumerationPreparationPositions, fixture.preparation);
    assert.equal(scenario.magicBurst.radiusConfirmed, false);
    assert.equal(scenario.magicBurst.displayRadius, .72);
    assert.equal(scenario.magicBurst.enumerationDisplayRadius, .45);
    assert.equal(scenario.magicBurst.enumerationRadiusConfirmed, false);
    assert.deepEqual(scenario.magicBurst.enumerationGroups, [
      ['tank', 'dps-melee'], ['healer', 'dps-ranged']
    ]);
    assert.equal(new Set(Object.values(scenario.magicBurst.placementPositions)
      .map(point => `${point.x}-${point.y}`)).size, 4);
    assert.equal(new Set(Object.values(scenario.magicBurst.enumerationPreparationPositions)
      .map(point => `${point.x}-${point.y}`)).size, 4);

    const floor = summonedDollsFloorAtEvent(
      'prepare-magic-burst', scenario, scenario.spreadPositions,
      scenario.pattern.stepSnapshots.length - 1
    );
    for (const point of [
      ...Object.values(scenario.magicBurst.placementPositions),
      ...Object.values(scenario.magicBurst.enumerationPreparationPositions)
    ]) {
      const cell = floor.find(candidate =>
        candidate.row === Math.floor(point.y) && candidate.col === Math.floor(point.x));
      assert.ok(cell);
      assert.ok(!cell.effects.some(effect =>
        effect.kind === 'pattern-danger' || effect.kind === 'light-blast-lethal'));
    }
    const minimumMagicBurstMargin = Math.min(...Object.values(fixture.preparation).map(point =>
      Math.min(...Object.values(fixture.placement).map(center =>
        Math.hypot(point.x - center.x, point.y - center.y)
          - scenario.magicBurst.displayRadius))));
    assert.ok(minimumMagicBurstMargin >= .15);
  }
});

test('both confirmed doll configurations produce explicit collision-free one-cell shift plans', () => {
  const fixtures = [
    {
      pattern: [0, 2, 4],
      expected: {
        tank: { x: .38, y: 2.28 },
        healer: { x: 2.38, y: 2.28 },
        'dps-melee': { x: .62, y: 3.72 },
        'dps-ranged': { x: 2.62, y: 3.72 }
      }
    },
    {
      pattern: [1, 3, 4],
      expected: {
        tank: { x: 1.38, y: 2.28 },
        healer: { x: 3.38, y: 2.28 },
        'dps-melee': { x: 1.62, y: 3.72 },
        'dps-ranged': { x: 3.62, y: 3.72 }
      }
    }
  ];

  for (const fixture of fixtures) {
    const scenario = createFixedSummonedDollsScenario('north', fixture.pattern);
    const floor = summonedDollsFloorAtEvent(
      'prepare-shift', scenario, scenario.spreadPositions, scenario.pattern.stepSnapshots.length - 1
    );
    const plan = createSummonedDollsShiftPlan(scenario, scenario.spreadPositions, floor);
    assert.equal(plan.collisionFree, true);
    for (const member of scenario.party) {
      assertPointClose(plan.targetPositions[member.id], fixture.expected[member.id]);
    }
    assert.equal(new Set(Object.values(plan.targetCells).map(cell => `${cell.row}-${cell.col}`)).size, 4);

    for (const member of scenario.party) {
      const before = scenario.spreadPositions[member.id];
      const after = plan.targetPositions[member.id];
      assert.ok(Math.abs(Math.abs(after.x - before.x) - 1) <= 1e-9);
      assert.equal(after.y, before.y);
      const targetFloor = floor.find(cell =>
        cell.row === Math.floor(after.y) && cell.col === Math.floor(after.x));
      assert.ok(targetFloor);
      assert.ok(!targetFloor.effects.some(effect => [
        'pattern-step', 'pattern-danger', 'light-blast-lethal'
      ].includes(effect.kind)));
      assert.ok(scenario.configuration.dolls.some(doll => doll.attackCells.some(cell =>
        cell.row === targetFloor.row && cell.col === targetFloor.col)));
    }
  }
});

test('enumeration evaluation accepts the two expected pairs with independent DPS centers', () => {
  for (const pattern of SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS) {
    const scenario = createFixedSummonedDollsScenario('north', pattern);
    const result = evaluateSummonedDollsEnumeration(
      scenario,
      scenario.magicBurst.enumerationPreparationPositions
    );
    assert.equal(result.radius, .45);
    assert.equal(result.radiusConfirmed, false);
    assert.equal(result.allGroupsPassDisplayCheck, true);
    assert.deepEqual(result.playersInBothGroups, []);
    assert.deepEqual(result.groups['dps-melee'].memberIds, ['tank', 'dps-melee']);
    assert.deepEqual(result.groups['dps-ranged'].memberIds, ['healer', 'dps-ranged']);
    assert.ok(Math.abs(result.groups['dps-melee'].distances.tank - Math.SQRT2 * .2) < 1e-9);
    assert.ok(Math.abs(result.groups['dps-ranged'].distances.healer - Math.SQRT2 * .2) < 1e-9);
  }
});

test('enumeration evaluation distinguishes under, over, wrong-group, and overlapping membership', () => {
  const scenario = createFixedSummonedDollsScenario('north', [0, 2, 4]);
  const base = scenario.magicBurst.enumerationPreparationPositions;
  const clone = () => Object.fromEntries(Object.entries(base)
    .map(([id, point]) => [id, { ...point }]));

  const under = clone();
  under.tank = { x: 4.8, y: .2 };
  const underResult = evaluateSummonedDollsEnumeration(scenario, under);
  assert.equal(underResult.groups['dps-melee'].countStatus, 'under');
  assert.equal(underResult.groups['dps-melee'].count, 1);

  const over = clone();
  over.healer = { ...over['dps-melee'] };
  const overResult = evaluateSummonedDollsEnumeration(scenario, over);
  assert.equal(overResult.groups['dps-melee'].countStatus, 'over');
  assert.deepEqual(overResult.groups['dps-melee'].unexpectedMemberIds, ['healer']);

  const wrong = clone();
  wrong.tank = { x: 4.8, y: .2 };
  wrong.healer = { ...wrong['dps-melee'] };
  const wrongResult = evaluateSummonedDollsEnumeration(scenario, wrong);
  assert.equal(wrongResult.groups['dps-melee'].countStatus, 'correct');
  assert.deepEqual(wrongResult.groups['dps-melee'].missingExpectedIds, ['tank']);
  assert.deepEqual(wrongResult.groups['dps-melee'].unexpectedMemberIds, ['healer']);
  assert.equal(wrongResult.groups['dps-melee'].passesDisplayCheck, false);

  const overlapping = {
    tank: { x: 2.45, y: 3 },
    healer: { x: 2.45, y: 3 },
    'dps-melee': { x: 2.3, y: 3 },
    'dps-ranged': { x: 2.6, y: 3 }
  };
  const overlapResult = evaluateSummonedDollsEnumeration(scenario, overlapping);
  assert.deepEqual(overlapResult.playersInBothGroups,
    ['tank', 'healer', 'dps-melee', 'dps-ranged']);
  assert.equal(overlapResult.allGroupsPassDisplayCheck, false);
});

test('shift-ready marks only calculated horizontal candidates instead of whole former gale lanes', () => {
  for (const pattern of SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS) {
    const scenario = createFixedSummonedDollsScenario('north', pattern);
    const resolvedFloor = summonedDollsFloorAtEvent(
      'prepare-shift', scenario, scenario.spreadPositions, scenario.pattern.stepSnapshots.length - 1
    );
    const plan = createSummonedDollsShiftPlan(scenario, scenario.spreadPositions, resolvedFloor);
    const candidatePositions = Object.values(plan.candidates).flat().map(candidate => candidate.position);
    const floor = summonedDollsFloorAtEvent(
      'shift-ready', scenario, scenario.spreadPositions,
      scenario.pattern.stepSnapshots.length - 1, candidatePositions
    );
    const safeKeys = new Set(floor.filter(cell =>
      cell.effects.some(effect => effect.kind === 'movement-safe'))
      .map(cell => `${cell.row}-${cell.col}`));
    assert.deepEqual(safeKeys, new Set(candidatePositions.map(position =>
      `${Math.floor(position.y)}-${Math.floor(position.x)}`)));
    assert.ok(safeKeys.size < 10);
  }
});

test('role selection locks after start while snapshot captures the selected role position', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  assert.equal(trainer.selectedPlayerId.value, 'tank');
  trainer.start();
  advanceUntil(trainer, 'spread-for-light-blast');
  const eventIndex = trainer.activeEventIndex.value;
  trainer.selectPlayer('dps-ranged');
  assert.equal(trainer.selectedPlayerId.value, 'tank');
  assert.equal(trainer.activeEventIndex.value, eventIndex);
  assert.equal(trainer.evenExplosionActive.value, true);

  trainer.setSelectedPlayerPosition({ x: 4.6, y: .6 });
  assert.deepEqual(trainer.partyPositions.value.tank, { x: 4.6, y: .6 });
  advanceUntil(trainer, 'light-blast-snapshot');
  assert.deepEqual(trainer.lightBlastSnapshot.value.tank, { x: 4.6, y: .6 });
  assert.equal(trainer.canMoveSelectedPlayer.value, false);
});

test('tutorial moves all four players while battle mode leaves YOU under player control', () => {
  const tutorial = useLalaRuSummonedDollsTrainer(() => 0);
  tutorial.start();
  advanceUntil(tutorial, 'spread-for-light-blast');
  assert.deepEqual(tutorial.partyPositions.value, tutorial.scenario.spreadPositions);

  const battle = useLalaRuSummonedDollsTrainer(() => 0);
  battle.setMode('battle');
  battle.selectPlayer('tank');
  battle.start();
  const playerStart = { ...battle.partyPositions.value.tank };
  advanceUntil(battle, 'spread-for-light-blast');
  assert.deepEqual(battle.partyPositions.value.tank, playerStart);
  for (const id of ['healer', 'dps-melee', 'dps-ranged']) {
    assert.deepEqual(battle.partyPositions.value[id], battle.scenario.spreadPositions[id]);
  }

  battle.selectPlayer('healer');
  assert.equal(battle.selectedPlayerId.value, 'tank');
  assert.deepEqual(battle.partyPositions.value.tank, playerStart);
});

test('tutorial animates into shift targets while battle mode never auto-moves YOU', async () => {
  const tutorial = useLalaRuSummonedDollsTrainer(() => 0);
  tutorial.scenario.shiftDisplayMs = 5;
  tutorial.start();
  advanceUntil(tutorial, 'shift-ready');
  const tutorialBefore = Object.fromEntries(Object.entries(tutorial.partyPositions.value)
    .map(([id, point]) => [id, { ...point }]));
  const tutorialTargets = Object.fromEntries(Object.entries(tutorial.shiftPlan.value.targetPositions)
    .map(([id, point]) => [id, { ...point }]));
  assert.equal(tutorial.shiftPhase.value, 'ready');
  tutorial.advance();
  assert.equal(tutorial.shiftPhase.value, 'moving');
  for (const id of ['tank', 'healer', 'dps-melee', 'dps-ranged']) {
    assertPointClose(tutorial.partyPositions.value[id], tutorialTargets[id]);
    assert.notDeepEqual(tutorial.partyPositions.value[id], tutorialBefore[id]);
  }
  await new Promise(resolve => setTimeout(resolve, 12));
  assert.equal(tutorial.currentEvent.value.id, 'shift-complete');
  assert.equal(tutorial.shiftPhase.value, 'complete');

  const battle = useLalaRuSummonedDollsTrainer(() => 0);
  battle.setMode('battle');
  battle.selectPlayer('tank');
  battle.start();
  advanceUntil(battle, 'spread-for-light-blast');
  battle.setSelectedPlayerPosition(battle.scenario.spreadPositions.tank);
  advanceUntil(battle, 'shift-ready');
  const playerBefore = { ...battle.partyPositions.value.tank };
  const battleTargets = Object.fromEntries(Object.entries(battle.shiftPlan.value.targetPositions)
    .map(([id, point]) => [id, { ...point }]));
  assert.equal(battle.canMoveSelectedPlayer.value, true);
  battle.advance();
  assert.deepEqual(battle.partyPositions.value.tank, playerBefore);
  for (const id of ['healer', 'dps-melee', 'dps-ranged']) {
    assertPointClose(battle.partyPositions.value[id], battleTargets[id]);
  }
  battle.setSelectedPlayerPosition(battleTargets.tank);
  assertPointClose(battle.partyPositions.value.tank, battleTargets.tank);
});

test('shift targets remain world-coordinate stable through camera rotation', () => {
  const scenario = createFixedSummonedDollsScenario('north', [1, 3, 4]);
  const floor = summonedDollsFloorAtEvent(
    'prepare-shift', scenario, scenario.spreadPositions, scenario.pattern.stepSnapshots.length - 1
  );
  const targets = createSummonedDollsShiftPlan(scenario, scenario.spreadPositions, floor).targetPositions;
  for (const rotation of [0, 90, 180, -90]) {
    for (const point of Object.values(targets)) {
      assertPointClose(cameraPointToWorldPoint(worldPointToCameraPoint(point, rotation), rotation), point);
    }
  }
});

test('magic burst creates four tracking circles, then freezes both impacts to one precise snapshot', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  advanceBattleToMagicBurstTargets(trainer);
  assert.equal(trainer.magicBurstPhase.value, 'targets');
  assert.equal(trainer.magicBurstCircles.value.length, 4);
  assert.ok(trainer.magicBurstCircles.value.every(circle =>
    circle.phase === 'tracking' && circle.radiusConfirmed === false));

  const precisePlayerPoint = { x: .237, y: 2.193 };
  trainer.setSelectedPlayerPosition(precisePlayerPoint);
  assert.deepEqual(
    trainer.magicBurstCircles.value.find(circle => circle.sourceId === 'tank').position,
    precisePlayerPoint
  );
  trainer.advance();
  assert.deepEqual(trainer.partyPositions.value.tank, precisePlayerPoint);
  for (const id of ['healer', 'dps-melee', 'dps-ranged']) {
    assertPointClose(
      trainer.partyPositions.value[id],
      trainer.scenario.magicBurst.placementPositions[id]
    );
  }

  advanceUntil(trainer, 'magic-burst-snapshot');
  assert.equal(trainer.magicBurstSnapshot.value.capturedAtEventId, 'magic-burst-snapshot');
  assert.equal(trainer.magicBurstSnapshot.value.radiusConfirmed, false);
  assert.deepEqual(trainer.magicBurstSnapshot.value.positions.tank, precisePlayerPoint);
  assert.equal(trainer.magicBurstCircles.value.length, 4);
  assert.ok(trainer.magicBurstCircles.value.every(circle => circle.phase === 'snapshot'));

  trainer.advance();
  assert.equal(trainer.currentEvent.value.id, 'magic-burst-first-impact');
  const escapedPoint = { x: 1.11, y: 3.11 };
  trainer.setSelectedPlayerPosition(escapedPoint);
  assert.deepEqual(trainer.partyPositions.value.tank, escapedPoint);
  assert.deepEqual(
    trainer.magicBurstCircles.value.find(circle => circle.sourceId === 'tank').position,
    precisePlayerPoint
  );

  advanceUntil(trainer, 'magic-burst-second-telegraph');
  assert.ok(trainer.magicBurstCircles.value.every(circle => circle.phase === 'second-telegraph'));
  const frozenSecondPositions = trainer.magicBurstCircles.value.map(circle => ({
    sourceId: circle.sourceId,
    position: { ...circle.position }
  }));
  trainer.setSelectedPlayerPosition({ x: 1.37, y: 3.27 });
  assert.deepEqual(trainer.magicBurstCircles.value.map(circle => ({
    sourceId: circle.sourceId,
    position: { ...circle.position }
  })), frozenSecondPositions);
  assert.equal(effectCount(trainer.floorCells.value, 'pattern-danger'), 12);
  assert.equal(effectCount(trainer.floorCells.value, 'light-blast-lethal'), 4);

  advanceUntil(trainer, 'magic-burst-second-impact');
  assert.ok(trainer.magicBurstCircles.value.every(circle => circle.phase === 'second-impact'));
  trainer.advance();
  assert.equal(trainer.currentEvent.value.id, 'enumeration-stack-snapshot');
  assert.equal(trainer.magicBurstCircles.value.length, 0);
});

test('tutorial places and evacuates all four while battle mode never auto-moves YOU', async () => {
  const tutorial = useLalaRuSummonedDollsTrainer(() => 0);
  tutorial.scenario.shiftDisplayMs = 1;
  tutorial.start();
  advanceUntil(tutorial, 'shift-to-former-aoe');
  await new Promise(resolve => setTimeout(resolve, 5));
  advanceUntil(tutorial, 'magic-burst-targets');
  tutorial.advance();
  assert.equal(tutorial.currentEvent.value.id, 'magic-burst-positioning');
  assert.deepEqual(tutorial.partyPositions.value, tutorial.scenario.magicBurst.placementPositions);
  advanceUntil(tutorial, 'magic-burst-second-telegraph');
  tutorial.advance();
  assert.equal(tutorial.currentEvent.value.id, 'magic-burst-evacuation');
  assert.deepEqual(
    tutorial.partyPositions.value,
    tutorial.scenario.magicBurst.enumerationPreparationPositions
  );

  const battle = useLalaRuSummonedDollsTrainer(() => 0);
  advanceBattleToMagicBurstTargets(battle);
  const youPlacementStart = { ...battle.partyPositions.value.tank };
  battle.advance();
  assert.deepEqual(battle.partyPositions.value.tank, youPlacementStart);
  advanceUntil(battle, 'magic-burst-snapshot');
  advanceUntil(battle, 'magic-burst-second-telegraph');
  const youEvacuationStart = { ...battle.partyPositions.value.tank };
  battle.advance();
  assert.deepEqual(battle.partyPositions.value.tank, youEvacuationStart);
  for (const id of ['healer', 'dps-melee', 'dps-ranged']) {
    assertPointClose(
      battle.partyPositions.value[id],
      battle.scenario.magicBurst.enumerationPreparationPositions[id]
    );
  }
});

test('tutorial resolves both enumeration groups after beginning collection before second impact', async () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  trainer.scenario.shiftDisplayMs = 1;
  trainer.start();
  advanceUntil(trainer, 'shift-to-former-aoe');
  await new Promise(resolve => setTimeout(resolve, 5));
  advanceUntil(trainer, 'magic-burst-evacuation');
  assert.deepEqual(
    trainer.partyPositions.value,
    trainer.scenario.magicBurst.enumerationPreparationPositions
  );
  const frozenMagicBurst = Object.fromEntries(Object.entries(
    trainer.magicBurstSnapshot.value.positions
  ).map(([id, point]) => [id, { ...point }]));

  trainer.advance();
  assert.equal(trainer.currentEvent.value.id, 'enumeration-stack-ready');
  assert.equal(trainer.enumerationCircles.value.length, 2);
  assert.equal(trainer.magicBurstCircles.value.length, 4);
  assert.deepEqual(trainer.magicBurstSnapshot.value.positions, frozenMagicBurst);

  trainer.advance();
  assert.equal(trainer.currentEvent.value.id, 'magic-burst-second-impact');
  assert.equal(trainer.magicBurstCircles.value.length, 4);
  trainer.advance();
  assert.equal(trainer.currentEvent.value.id, 'enumeration-stack-snapshot');
  assert.deepEqual(
    trainer.enumerationSnapshot.value.positions,
    trainer.scenario.magicBurst.enumerationPreparationPositions
  );
  assert.equal(trainer.magicBurstCircles.value.length, 0);

  trainer.advance();
  assert.equal(trainer.currentEvent.value.id, 'enumeration-stack-impact');
  assert.equal(trainer.enumerationResult.value.allGroupsPassDisplayCheck, true);
  assert.equal(trainer.evenExplosionActive.value, true);
  trainer.advance();
  assert.equal(trainer.currentEvent.value.id, 'enumeration-stack-resolved');
  assert.equal(trainer.enumerationCircles.value.length, 0);
  assert.equal(trainer.evenExplosionActive.value, false);
  trainer.advance();
  assert.equal(trainer.currentEvent.value.id, 'mechanic-finished');
  assert.equal(trainer.complete.value, true);
});

test('both doll configurations complete the full tutorial flow', async () => {
  for (const randomValue of [0, .99]) {
    const trainer = useLalaRuSummonedDollsTrainer(() => randomValue);
    trainer.scenario.shiftDisplayMs = 1;
    trainer.start();
    advanceUntil(trainer, 'shift-to-former-aoe');
    await new Promise(resolve => setTimeout(resolve, 5));
    advanceUntil(trainer, 'mechanic-finished');
    assert.equal(trainer.complete.value, true);
    assert.equal(trainer.enumerationResult.value.allGroupsPassDisplayCheck, true);
  }
});

test('battle snapshots YOU at the manually chosen enumeration position without moving it', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  advanceBattleToMagicBurstTargets(trainer);
  trainer.advance();
  trainer.setSelectedPlayerPosition(trainer.scenario.magicBurst.placementPositions.tank);
  advanceUntil(trainer, 'magic-burst-snapshot');
  const frozenMagicBurst = Object.fromEntries(Object.entries(
    trainer.magicBurstSnapshot.value.positions
  ).map(([id, point]) => [id, { ...point }]));
  advanceUntil(trainer, 'magic-burst-evacuation');
  const manualStackPoint = { ...trainer.scenario.magicBurst.enumerationPreparationPositions.tank };
  assert.notDeepEqual(trainer.partyPositions.value.tank, manualStackPoint);
  trainer.setSelectedPlayerPosition(manualStackPoint);
  advanceUntil(trainer, 'enumeration-stack-snapshot');
  assert.deepEqual(trainer.enumerationSnapshot.value.positions.tank, manualStackPoint);
  assert.deepEqual(trainer.magicBurstSnapshot.value.positions, frozenMagicBurst);
  trainer.advance();
  assert.equal(trainer.enumerationResult.value.allGroupsPassDisplayCheck, true);
});

test('role selection remains locked throughout magic burst', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  advanceBattleToMagicBurstTargets(trainer);
  const eventIndex = trainer.activeEventIndex.value;
  trainer.selectPlayer('healer');
  assert.equal(trainer.activeEventIndex.value, eventIndex);
  assert.equal(trainer.selectedPlayerId.value, 'tank');
});

test('magic burst snapshot remains in world coordinates through camera rotation', () => {
  const scenario = createFixedSummonedDollsScenario('north', [1, 3, 4]);
  for (const rotation of [0, 90, 180, -90]) {
    for (const point of Object.values(scenario.magicBurst.placementPositions)) {
      assertPointClose(cameraPointToWorldPoint(worldPointToCameraPoint(point, rotation), rotation), point);
    }
  }
});

test('camera rotation round trips preserve enumeration membership and distances', () => {
  const scenario = createFixedSummonedDollsScenario('north', [1, 3, 4]);
  const expected = evaluateSummonedDollsEnumeration(
    scenario,
    scenario.magicBurst.enumerationPreparationPositions
  );
  for (const rotation of [0, 90, 180, -90]) {
    const roundTripped = Object.fromEntries(Object.entries(
      scenario.magicBurst.enumerationPreparationPositions
    ).map(([id, point]) => [
      id,
      cameraPointToWorldPoint(worldPointToCameraPoint(point, rotation), rotation)
    ]));
    const actual = evaluateSummonedDollsEnumeration(scenario, roundTripped);
    assert.deepEqual(actual.groups['dps-melee'].memberIds, expected.groups['dps-melee'].memberIds);
    assert.deepEqual(actual.groups['dps-ranged'].memberIds, expected.groups['dps-ranged'].memberIds);
    for (const id of ['tank', 'healer', 'dps-melee', 'dps-ranged']) {
      assert.ok(Math.abs(
        actual.groups['dps-melee'].distances[id]
          - expected.groups['dps-melee'].distances[id]
      ) < 1e-9);
    }
  }
});

test('restart clears captured floor state and positions but preserves the single selected role', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  trainer.selectPlayer('dps-ranged');
  trainer.start();
  advanceUntil(trainer, 'spread-for-light-blast');
  trainer.setSelectedPlayerPosition({ x: 4.6, y: .6 });
  advanceUntil(trainer, 'light-blast-snapshot');
  assert.ok(trainer.lightBlastSnapshot.value);

  trainer.restart();
  assert.equal(trainer.currentEvent.value.id, 'even-explosion-status');
  assert.equal(trainer.lightBlastSnapshot.value, null);
  assert.deepEqual(trainer.partyPositions.value['dps-ranged'], { x: 3.55, y: 4.25 });
  assert.equal(trainer.selectedPlayerId.value, 'dps-ranged');
});

test('restart clears an in-progress shift plan, candidate floor, and movement phase', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  trainer.start();
  advanceUntil(trainer, 'shift-ready');
  assert.ok(trainer.shiftStartPositions.value);
  assert.ok(trainer.shiftPlan.value);
  assert.ok(effectCount(trainer.floorCells.value, 'movement-safe') > 0);

  trainer.restart();
  assert.equal(trainer.shiftStartPositions.value, null);
  assert.equal(trainer.shiftPlan.value, null);
  assert.equal(trainer.shiftPhase.value, 'locked-before-gale');
  assert.equal(effectCount(trainer.floorCells.value, 'movement-safe'), 0);
});

test('restart clears magic burst start, snapshot, circles, and phase', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  advanceBattleToMagicBurstTargets(trainer);
  advanceUntil(trainer, 'magic-burst-snapshot');
  assert.ok(trainer.magicBurstStartPositions.value);
  assert.ok(trainer.magicBurstSnapshot.value);
  assert.equal(trainer.magicBurstCircles.value.length, 4);

  trainer.restart();
  assert.equal(trainer.magicBurstStartPositions.value, null);
  assert.equal(trainer.magicBurstSnapshot.value, null);
  assert.equal(trainer.magicBurstCircles.value.length, 0);
  assert.equal(trainer.magicBurstPhase.value, 'inactive');
});

test('restart clears enumeration snapshot, result, ranges, and phase', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  advanceBattleToMagicBurstTargets(trainer);
  advanceUntil(trainer, 'enumeration-stack-snapshot');
  trainer.advance();
  assert.ok(trainer.enumerationSnapshot.value);
  assert.ok(trainer.enumerationResult.value);

  trainer.restart();
  assert.equal(trainer.enumerationSnapshot.value, null);
  assert.equal(trainer.enumerationResult.value, null);
  assert.equal(trainer.enumerationCircles.value.length, 0);
  assert.equal(trainer.enumerationPhase.value, 'inactive');
  assert.equal(trainer.evenExplosionActive.value, true);
});

test('restart rerolls the confirmed lane configuration without opening an unconfirmed side combination', () => {
  const values = [0, .99];
  let index = 0;
  const trainer = useLalaRuSummonedDollsTrainer(() => values[index++]);
  trainer.selectPlayer('healer');
  trainer.start();
  assert.deepEqual(trainer.scenario.configuration.dollLanes, [0, 2, 4]);
  assert.equal(trainer.scenario.configuration.dollSide, 'north');

  trainer.restart();
  assert.deepEqual(trainer.scenario.configuration.dollLanes, [1, 3, 4]);
  assert.equal(trainer.scenario.configuration.dollSide, 'north');
  assert.equal(trainer.currentEvent.value.id, 'even-explosion-status');
  assert.equal(trainer.selectedPlayerId.value, 'healer');
});

test('restart clears an in-progress pattern snapshot and restores a clean floor', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  trainer.start();
  advanceUntil(trainer, 'changing-pattern-step');
  trainer.advance();
  trainer.advance();
  assert.equal(trainer.patternStepIndex.value, 3);
  assert.ok(effectCount(trainer.floorCells.value, 'pattern-danger') > 0);

  trainer.restart();
  assert.equal(trainer.patternStepIndex.value, 0);
  assert.equal(trainer.currentEvent.value.id, 'even-explosion-status');
  assert.equal(effectCount(trainer.floorCells.value, 'pattern-danger'), 0);
  assert.equal(effectCount(trainer.floorCells.value, 'pattern-step'), 0);
});

test('pattern playback uses the configurable display interval without claiming game timing', async () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  trainer.scenario.pattern.displayStepMs = 5;
  trainer.start();
  advanceUntil(trainer, 'changing-pattern-step');
  assert.equal(trainer.patternStepIndex.value, 1);
  await new Promise(resolve => setTimeout(resolve, 18));
  assert.ok(trainer.patternStepIndex.value > 1);
  assert.equal(trainer.scenario.pattern.timingConfirmed, false);
  trainer.restart();
});
