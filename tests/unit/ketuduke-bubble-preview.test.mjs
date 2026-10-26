import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useBubblePreview } from '../../src/composables/useBubblePreview.ts';
import { resolvePartyMechanic } from '../../src/mechanics/ketuduke/bubble-timeline.ts';

function animationClock() {
  let nextId = 1;
  const callbacks = new Map();
  globalThis.requestAnimationFrame = callback => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = id => callbacks.delete(id);
  globalThis.window = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout
  };
  return {
    frame(timestamp) {
      const pending = [...callbacks.values()];
      callbacks.clear();
      for (const callback of pending) callback(timestamp);
    }
  };
}

test('spread-first NPCs reach a valid T+21 standard answer in both bubble configurations', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.999;
  try {
    const expectedPlayerPositions = {
      T: { x: 0.5, y: 0.5 },
      H: { x: 3.5, y: 3.5 },
      D1: { x: 0.5, y: 3.5 },
      D2: { x: 3.5, y: 0.5 }
    };
    for (const configuration of ['A', 'B']) {
      for (const playerRole of ['T', 'H', 'D1', 'D2']) {
        const clock = animationClock();
        const scope = effectScope();
        const preview = scope.run(() => useBubblePreview());
        preview.setConfigurationMode(configuration);
        preview.selectPlayerRole(playerRole);
        preview.chooseMechanicOrder('spread-first');

        for (let frame = 0; frame <= 210; frame += 1) {
          clock.frame(frame * 1000 / 10);
        }

        const npcOnlySpread = resolvePartyMechanic('spread', {
          ...preview.partyPositions.value,
          [playerRole]: expectedPlayerPositions[playerRole]
        }, 0.18);
        assert.equal(
          npcOnlySpread.success,
          true,
          `${configuration}/${playerRole}: ${npcOnlySpread.message}`
        );
        assert.equal(
          preview.npcDebugAlerts.value.length,
          0,
          `${configuration}/${playerRole}: ${JSON.stringify(preview.npcDebugAlerts.value)}`
        );
        scope.stop();
      }
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('stack-first NPC pairs reach a valid T+21 standard answer in both bubble configurations', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const partners = { T: 'D1', D1: 'T', H: 'D2', D2: 'H' };
    for (const configuration of ['A', 'B']) {
      for (const playerRole of ['T', 'H', 'D1', 'D2']) {
        const clock = animationClock();
        const scope = effectScope();
        const preview = scope.run(() => useBubblePreview());
        preview.setConfigurationMode(configuration);
        preview.selectPlayerRole(playerRole);
        preview.chooseMechanicOrder('stack-first');

        for (let frame = 0; frame <= 210; frame += 1) {
          clock.frame(frame * 1000 / 10);
        }

        const partner = partners[playerRole];
        const npcOnlyStack = resolvePartyMechanic('stack', {
          ...preview.partyPositions.value,
          [playerRole]: { ...preview.partyPositions.value[partner] }
        }, 0.18);
        assert.equal(
          npcOnlyStack.success,
          true,
          `${configuration}/${playerRole}: ${npcOnlyStack.message}`
        );
        assert.equal(
          preview.npcDebugAlerts.value.length,
          0,
          `${configuration}/${playerRole}: ${JSON.stringify(preview.npcDebugAlerts.value)}`
        );
        scope.stop();
      }
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('both mechanic orders resolve at T+26 for every player role and bubble configuration', () => {
  const originalRandom = Math.random;
  try {
    const partners = { T: 'D1', D1: 'T', H: 'D2', D2: 'H' };
    const firstSpreadPositions = {
      T: { x: 0.5, y: 0.5 },
      D2: { x: 3.5, y: 0.5 },
      D1: { x: 0.5, y: 3.5 },
      H: { x: 3.5, y: 3.5 }
    };
    const secondSpreadPositions = {
      A: {
        T: { x: 0.8, y: 2.2 }, D1: { x: 1.5, y: 0.18 },
        H: { x: 3.2, y: 1.8 }, D2: { x: 2.5, y: 3.82 }
      },
      B: {
        T: { x: 2.2, y: 0.8 }, D1: { x: 0.18, y: 1.5 },
        H: { x: 1.8, y: 3.2 }, D2: { x: 3.82, y: 2.5 }
      }
    };
    const clearPlayerFailure = preview => {
      preview.dead.value = false;
      preview.deathCause.value = null;
      preview.capturedRole.value = null;
      preview.capturedBubbleId.value = null;
    };

    for (const order of ['stack-first', 'spread-first']) {
      Math.random = () => order === 'stack-first' ? 0 : 0.999;
      for (const configuration of ['A', 'B']) {
        for (const playerRole of ['T', 'H', 'D1', 'D2']) {
          const clock = animationClock();
          const scope = effectScope();
          const preview = scope.run(() => useBubblePreview());
          preview.setConfigurationMode(configuration);
          preview.selectPlayerRole(playerRole);
          preview.chooseMechanicOrder(order);

          for (let frame = 0; frame < 210; frame += 1) {
            clock.frame(frame * 1000 / 10);
          }
          preview.partyPositions.value = {
            ...preview.partyPositions.value,
            [playerRole]: order === 'stack-first'
              ? { ...preview.partyPositions.value[partners[playerRole]] }
              : { ...firstSpreadPositions[playerRole] }
          };
          clearPlayerFailure(preview);
          clock.frame(210 * 1000 / 10);
          clock.frame(211 * 1000 / 10);
          assert.equal(
            preview.firstResolutionSucceeded.value,
            true,
            `${order}/${configuration}/${playerRole}: first ${preview.deathCause.value}`
          );

          for (let frame = 212; frame < 260; frame += 1) {
            clock.frame(frame * 1000 / 10);
          }
          preview.partyPositions.value = {
            ...preview.partyPositions.value,
            [playerRole]: order === 'spread-first'
              ? { ...preview.partyPositions.value[partners[playerRole]] }
              : { ...secondSpreadPositions[configuration][playerRole] }
          };
          clearPlayerFailure(preview);
          clock.frame(260 * 1000 / 10);
          clock.frame(261 * 1000 / 10);
          clock.frame(262 * 1000 / 10);

          assert.equal(
            preview.secondResolutionSucceeded.value,
            true,
            `${order}/${configuration}/${playerRole}: second ${preview.deathCause.value} ${JSON.stringify(preview.partyPositions.value)}`
          );
          assert.equal(
            preview.npcDebugAlerts.value.some(alert => alert.hazard === 'bubble'),
            false,
            `${order}/${configuration}/${playerRole}: ${JSON.stringify(preview.npcDebugAlerts.value)}`
          );
          scope.stop();
        }
      }
    }
  } finally {
    Math.random = originalRandom;
  }
});
