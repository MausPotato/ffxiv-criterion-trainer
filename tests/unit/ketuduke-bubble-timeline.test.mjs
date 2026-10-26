import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUND_AOE_SCHEDULES,
  circlesTouch,
  groundAoeSnapshotsForRoles,
  mechanicKindForSlot,
  randomMechanicOrder,
  resolvePartyMechanic,
  timelineEventsBetween
} from '../../src/mechanics/ketuduke/bubble-timeline.ts';

test('both hydration casts use the same three-circle rhythm and three-second fuse', () => {
  assert.deepEqual(
    GROUND_AOE_SCHEDULES.map(({ cycle, round, spawnAtSeconds, explodeAtSeconds }) => ({
      cycle,
      round,
      spawnAtSeconds,
      explodeAtSeconds
    })),
    [
      { cycle: 1, round: 1, spawnAtSeconds: 17, explodeAtSeconds: 20 },
      { cycle: 1, round: 2, spawnAtSeconds: 19, explodeAtSeconds: 22 },
      { cycle: 1, round: 3, spawnAtSeconds: 21, explodeAtSeconds: 24 },
      { cycle: 2, round: 1, spawnAtSeconds: 26, explodeAtSeconds: 29 },
      { cycle: 2, round: 2, spawnAtSeconds: 28, explodeAtSeconds: 31 },
      { cycle: 2, round: 3, spawnAtSeconds: 30, explodeAtSeconds: 33 }
    ]
  );
});

test('timeline thresholds are crossed once even when a frame spans several events', () => {
  const events = timelineEventsBetween(20.9, 26.1);
  assert.deepEqual(events.map(event => event.type), [
    'ground-aoe-spawn',
    'mechanic-resolve',
    'ground-aoe-explode',
    'ground-aoe-explode',
    'ground-aoe-spawn',
    'mechanic-resolve'
  ]);
  assert.equal(timelineEventsBetween(21, 21.1).length, 0);
});

test('mechanic order is randomized as a whole and the second mechanic is always opposite', () => {
  assert.equal(randomMechanicOrder(() => 0), 'stack-first');
  assert.equal(randomMechanicOrder(() => 0.999), 'spread-first');
  assert.equal(mechanicKindForSlot('stack-first', 'first'), 'stack');
  assert.equal(mechanicKindForSlot('stack-first', 'second'), 'spread');
  assert.equal(mechanicKindForSlot('spread-first', 'first'), 'spread');
  assert.equal(mechanicKindForSlot('spread-first', 'second'), 'stack');
});

test('yellow AOE collision includes touching circle edges without extra padding', () => {
  assert.equal(circlesTouch({ x: 1, y: 1 }, 0.5, { x: 1.68, y: 1 }, 0.18), true);
  assert.equal(circlesTouch({ x: 1, y: 1 }, 0.5, { x: 1.681, y: 1 }, 0.18), false);
});

test('first Hydration Bomb snapshots all four role positions with stable unique ids', () => {
  const positions = {
    T: { x: 0.5, y: 0.5 },
    H: { x: 3.5, y: 3.5 },
    D1: { x: 0.5, y: 1.5 },
    D2: { x: 3.5, y: 2.5 }
  };
  const snapshots = groundAoeSnapshotsForRoles(
    GROUND_AOE_SCHEDULES[0],
    positions,
    ['T', 'H', 'D1', 'D2']
  );
  assert.deepEqual(snapshots.map(({ id, sourceRole, position }) => ({
    id,
    sourceRole,
    position
  })), [
    { id: 'cycle-1-round-1-T', sourceRole: 'T', position: { x: 0.5, y: 0.5 } },
    { id: 'cycle-1-round-1-H', sourceRole: 'H', position: { x: 3.5, y: 3.5 } },
    { id: 'cycle-1-round-1-D1', sourceRole: 'D1', position: { x: 0.5, y: 1.5 } },
    { id: 'cycle-1-round-1-D2', sourceRole: 'D2', position: { x: 3.5, y: 2.5 } }
  ]);
  positions.T.x = 2;
  assert.equal(snapshots[0].position.x, 0.5);
});

test('stack resolution requires exactly T with D1 and H with D2', () => {
  const correct = {
    T: { x: 0.5, y: 0.5 },
    D1: { x: 0.5, y: 0.5 },
    H: { x: 3.5, y: 3.5 },
    D2: { x: 3.5, y: 3.5 }
  };
  assert.equal(resolvePartyMechanic('stack', correct, 0.18).success, true);

  const missingPartner = { ...correct, D1: { x: 1.5, y: 1.5 } };
  const missingResult = resolvePartyMechanic('stack', missingPartner, 0.18);
  assert.equal(missingResult.success, false);
  assert.match(missingResult.message, /T＋D1/);

  const wrongPartner = { ...correct, D1: { x: 1.5, y: 1.5 }, H: { x: 0.5, y: 0.5 } };
  assert.equal(resolvePartyMechanic('stack', wrongPartner, 0.18).success, false);
});

test('spread resolution checks every role against every other damage circle', () => {
  const correct = {
    T: { x: 0.5, y: 0.5 },
    D1: { x: 0.5, y: 3.5 },
    H: { x: 3.5, y: 3.5 },
    D2: { x: 3.5, y: 0.5 }
  };
  assert.equal(resolvePartyMechanic('spread', correct, 0.18).success, true);

  const overlap = { ...correct, D1: { x: 1.5, y: 0.5 } };
  const overlapResult = resolvePartyMechanic('spread', overlap, 0.18);
  assert.equal(overlapResult.success, false);
  assert.match(overlapResult.message, /T.*D1|D1.*T/);
});
