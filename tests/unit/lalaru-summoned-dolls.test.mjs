import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS,
  SUMMONED_DOLLS_EVENTS,
  createFixedSummonedDollsScenario,
  createSummonedDollsConfiguration,
  createSummonedDollsScenario,
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
  assert.equal(evenExplosion.expiresAtEventId, 'dps-stacks');
  assert.equal(evenExplosion.resolvesAtEventId, 'dps-stacks');
  assert.deepEqual(evenExplosion.resolutionPairs, [
    { targetId: 'dps-melee', partnerId: 'tank' },
    { targetId: 'dps-ranged', partnerId: 'healer' }
  ]);
  assert.equal(summonedDollsStatusStateAtEvent(evenExplosion, null, scenario), 'pending');
  assert.equal(summonedDollsStatusStateAtEvent(evenExplosion, 'summon-dolls', scenario), 'active');
  assert.equal(summonedDollsStatusStateAtEvent(evenExplosion, 'dps-stacks', scenario), 'resolved');

  assert.deepEqual(vulnerability.targetIds, ['tank', 'healer', 'dps-melee', 'dps-ranged']);
  assert.equal(vulnerability.durationMs, null);
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
    'prepare-shift'
  ]);
  assert.deepEqual(SUMMONED_DOLLS_EVENTS.filter(event => !event.implemented).map(event => event.id), [
    'shift-to-former-aoe',
    'magic-burst-cast',
    'spread-markers',
    'second-aoe-placement',
    'return-to-center',
    'dps-stacks'
  ]);
  assert.deepEqual(scenario.firstResolution.sources, ['light-blast', 'gale']);
  assert.equal(scenario.firstResolution.relativeOrderConfirmed, false);
  assert.ok(scenario.events.every(event => event.timingConfirmed === false));
});

test('role switching preserves progress and status while snapshot captures judgment-time positions', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  assert.equal(trainer.selectedPlayerId.value, 'tank');
  trainer.start();
  advanceUntil(trainer, 'spread-for-light-blast');
  const eventIndex = trainer.activeEventIndex.value;
  trainer.selectPlayer('dps-ranged');
  assert.equal(trainer.activeEventIndex.value, eventIndex);
  assert.equal(trainer.evenExplosionActive.value, true);

  trainer.setSelectedPlayerPosition({ x: 4.6, y: .6 });
  assert.deepEqual(trainer.partyPositions.value['dps-ranged'], { x: 4.6, y: .6 });
  advanceUntil(trainer, 'light-blast-snapshot');
  assert.deepEqual(trainer.lightBlastSnapshot.value['dps-ranged'], { x: 4.6, y: .6 });
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
  assert.deepEqual(battle.partyPositions.value.tank, battle.scenario.spreadPositions.tank);
  assert.deepEqual(battle.partyPositions.value.healer, { x: 3.55, y: 3.55 });
});

test('restart clears captured floor state and positions but preserves the single selected role', () => {
  const trainer = useLalaRuSummonedDollsTrainer(() => 0);
  trainer.start();
  advanceUntil(trainer, 'spread-for-light-blast');
  trainer.selectPlayer('dps-ranged');
  trainer.setSelectedPlayerPosition({ x: 4.6, y: .6 });
  advanceUntil(trainer, 'light-blast-snapshot');
  assert.ok(trainer.lightBlastSnapshot.value);

  trainer.restart();
  assert.equal(trainer.currentEvent.value.id, 'even-explosion-status');
  assert.equal(trainer.lightBlastSnapshot.value, null);
  assert.deepEqual(trainer.partyPositions.value['dps-ranged'], { x: 3.55, y: 4.25 });
  assert.equal(trainer.selectedPlayerId.value, 'dps-ranged');
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
