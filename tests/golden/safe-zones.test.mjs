import test from 'node:test';
import assert from 'node:assert/strict';
import { createLegacyHarness } from '../helpers/legacy-harness.mjs';
import { referenceSafeZones } from '../../src/mechanics/ketuduke/safe-zones.ts';

const cases = [
  { center: [1, 1, 'h'], safe: [0, 2, 12, 14] },
  { center: [1, 1, 'v'], safe: [0, 3, 8, 11] },
  { center: [1, 2, 'h'], safe: [1, 3, 13, 15] },
  { center: [1, 2, 'v'], safe: [0, 3, 8, 11] },
  { center: [2, 1, 'h'], safe: [0, 2, 12, 14] },
  { center: [2, 1, 'v'], safe: [4, 7, 12, 15] },
  { center: [2, 2, 'h'], safe: [1, 3, 13, 15] },
  { center: [2, 2, 'v'], safe: [4, 7, 12, 15] }
];

test('V4.5 golden safe zones: four center cells x two orientations', async t => {
  const { api } = createLegacyHarness();

  for (const { center: [r, c, o], safe } of cases) {
    await t.test(`center=(${r},${c}), orientation=${o}`, () => {
      api.setGame({ center: { r, c, o }, crystals: [], buffs: {}, party: '分散', rotation: 'cw' });
      const legacy = [...api.referenceSafe()].sort((a, b) => a - b);
      const extracted = [...referenceSafeZones({ r, c, o })].sort((a, b) => a - b);
      assert.deepEqual(legacy, safe);
      assert.deepEqual(extracted, safe);
      assert.deepEqual(extracted, legacy);
      assert.equal(extracted.length, 4);
    });
  }
});
