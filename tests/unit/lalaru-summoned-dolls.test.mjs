import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUMMONED_DOLLS_EVENTS,
  createFixedSummonedDollsScenario,
  createSummonedDollsConfiguration,
  rotateSummonedDollsCell,
  summonedDollsFloorAtEvent
} from '../../src/mechanics/lalaru/index.ts';
import { useLalaRuSummonedDollsTrainer } from '../../src/composables/useLalaRuSummonedDollsTrainer.ts';

const key = cell => `${cell.row}-${cell.col}`;

test('fixed north fixture keeps three attack lanes and two separated safe lanes', () => {
  const configuration = createSummonedDollsConfiguration('north');
  assert.deepEqual(configuration.dollLanes, [0, 2, 4]);
  assert.deepEqual(configuration.safeLanes, [1, 3]);
  assert.equal(configuration.dolls.length, 3);
  assert.deepEqual(configuration.dolls.map(doll => doll.attackCells.length), [5, 5, 5]);
  assert.deepEqual(configuration.dolls.map(doll => doll.worldLane), [0, 2, 4]);
});

test('configuration rejects layouts that violate the separated empty-lane rule', () => {
  assert.throws(() => createSummonedDollsConfiguration('north', [0, 1, 2]), /exactly one lane/);
  assert.throws(() => createSummonedDollsConfiguration('north', [0, 0, 4]), /three unique lanes/);
});

test('mechanic-local cells rotate to every doll side without changing grid bounds', () => {
  assert.deepEqual(rotateSummonedDollsCell({ row: 0, col: 1 }, 'north'), { row: 0, col: 1 });
  assert.deepEqual(rotateSummonedDollsCell({ row: 0, col: 1 }, 'east'), { row: 1, col: 4 });
  for (const side of ['north', 'east', 'south', 'west']) {
    const configuration = createSummonedDollsConfiguration(side);
    assert.ok(configuration.dolls.flatMap(doll => doll.attackCells)
      .every(cell => cell.row >= 0 && cell.row < 5 && cell.col >= 0 && cell.col < 5));
  }
});

test('floor snapshots are state data and first explosion resolves the demo path', () => {
  const lines = summonedDollsFloorAtEvent('line-aoe');
  const warning = summonedDollsFloorAtEvent('changing-pattern-warning');
  const stepping = summonedDollsFloorAtEvent('changing-pattern-step');
  const impact = summonedDollsFloorAtEvent('first-changing-explosion');
  assert.equal(warning.length, 25);
  assert.equal(lines.filter(cell => cell.state === 'danger').length, 15);
  assert.equal(lines.filter(cell => cell.state === 'temporary-safe').length, 10);
  const eastScenario = { ...createFixedSummonedDollsScenario(), configuration: createSummonedDollsConfiguration('east') };
  const eastLines = summonedDollsFloorAtEvent('line-aoe', eastScenario);
  assert.ok(eastLines.filter(cell => cell.state === 'temporary-safe')
    .every(cell => cell.row === 1 || cell.row === 3));
  assert.equal(warning.filter(cell => cell.state === 'telegraph').length, 3);
  assert.ok(stepping.some(cell => cell.state === 'resolved'));
  assert.ok(stepping.some(cell => cell.state === 'telegraph'));
  assert.equal(impact.filter(cell => cell.state === 'resolved').length, 6);
  assert.equal(new Set(impact.map(key)).size, 25);
});

test('event catalog implements only the requested front half and preserves back-half order', () => {
  const scenario = createFixedSummonedDollsScenario();
  assert.deepEqual(scenario.implementedEventIds, [
    'summon-dolls',
    'line-aoe',
    'changing-pattern-warning',
    'changing-pattern-step',
    'first-changing-explosion'
  ]);
  assert.deepEqual(SUMMONED_DOLLS_EVENTS.filter(event => !event.implemented).map(event => event.id), [
    'shift-to-former-aoe',
    'magic-burst-cast',
    'spread-markers',
    'second-aoe-placement',
    'return-to-center',
    'dps-stacks'
  ]);
  assert.equal(scenario.party.filter(member => member.hasStackBuff).length, 2);
  assert.ok(scenario.party.filter(member => member.hasStackBuff).every(member => member.role === 'dps'));
});

test('player selection defaults to tank and remains a single party member across resets', () => {
  const trainer = useLalaRuSummonedDollsTrainer();
  assert.equal(trainer.selectedPlayerId.value, 'tank');
  assert.equal(trainer.selectedPlayer.value.id, 'tank');

  for (const id of ['healer', 'dps-melee', 'dps-ranged', 'tank']) {
    trainer.selectPlayer(id);
    assert.equal(trainer.selectedPlayerId.value, id);
    assert.equal(trainer.selectedPlayer.value.id, id);
  }

  trainer.selectPlayer('dps-ranged');
  trainer.start();
  trainer.reset();
  assert.equal(trainer.selectedPlayerId.value, 'dps-ranged');
});
