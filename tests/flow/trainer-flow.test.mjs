import test from 'node:test';
import assert from 'node:assert/strict';
import { createLegacyHarness } from '../helpers/legacy-harness.mjs';

const FIXED_GAME = {
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

function startFixedRound() {
  const harness = createLegacyHarness();
  harness.api.setGame(structuredClone(FIXED_GAME));
  harness.element('focus').value = 'MT';
  harness.element('focus').onchange();
  harness.element('startGame').click();
  return harness;
}

test('reproducible success flow preserves phase and timer transitions', () => {
  const harness = startFixedRound();
  const { api, scheduler } = harness;

  assert.deepEqual(
    { ready: api.getState().ready, phase: api.getState().phase, mahVisible: api.getState().mahVisible },
    { ready: true, phase: 0, mahVisible: false }
  );

  const queueCell = api.autoQueue().MT;
  harness.boardTile(queueCell).click();
  harness.element('confirm').click();
  assert.equal(api.getState().hasChecked, true);
  assert.equal(api.getState().phase, 0);

  scheduler.advanceTo(5_000);
  assert.equal(api.getState().mahVisible, false, '80 ms polling has not crossed the boundary yet');
  scheduler.advanceTo(5_040);
  assert.equal(api.getState().mahVisible, true);
  assert.equal(api.getState().phase, 1);

  const solution = api.solveParty();
  assert.ok(solution, 'fixed fixture must have a full-party solution');
  harness.boardTile(solution.pre.MT).click();
  harness.element('confirm').click();

  const final = api.getState();
  assert.equal(final.phase, 2);
  assert.equal(final.lockPosition, true);
  assert.equal(final.review, true);
  assert.equal(final.wins, 1);
  assert.equal(final.streak, 1);
  assert.equal(api.validateCrystalGeometry().ok, true);
});

test('timer reveals mahjong and locks an unanswered round at ten seconds', () => {
  const harness = startFixedRound();
  const { api, scheduler } = harness;

  scheduler.advanceTo(5_040);
  assert.equal(api.getState().mahVisible, true);
  assert.equal(api.getState().phase, 0, 'without a queue answer, reveal does not advance the phase');

  scheduler.advanceTo(10_000);
  const state = api.getState();
  assert.equal(state.lockPosition, true);
  assert.equal(state.phase, 0);
  assert.equal(state.streak, 0);
  assert.equal(harness.element('deathOverlay').classList.contains('open'), true);
  assert.match(harness.element('deathReason').textContent, /超過站位時間/);
});

test('a selected queue tile is scored automatically at the reveal boundary', () => {
  const harness = startFixedRound();
  const { api, scheduler } = harness;

  harness.boardTile(api.autoQueue().MT).click();
  assert.equal(api.getState().hasChecked, false);
  scheduler.advanceTo(5_040);

  const state = api.getState();
  assert.equal(state.hasChecked, true);
  assert.equal(state.mahVisible, true);
  assert.equal(state.phase, 1);
  assert.deepEqual(state.queue, api.autoQueue());
});
