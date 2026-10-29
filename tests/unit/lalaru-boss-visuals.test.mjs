import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LALARU_BOSS_DIAMETER } from '../../src/presentation/lalaru/actor-visuals.ts';

const componentUrls = [
  '../../src/components/lalaru/LalaRuArena.vue',
  '../../src/components/lalaru/LalaRuAnalysisArena.vue',
  '../../src/components/lalaru/LalaRuCompositeArena.vue',
  '../../src/components/lalaru/LalaRuSpatialBombsArena.vue',
  '../../src/components/lalaru/LalaRuSummonedDollsArena.vue'
];

test('every Lala Ru boss uses the shared world-space visual diameter', async () => {
  assert.equal(LALARU_BOSS_DIAMETER, .72);
  for (const componentUrl of componentUrls) {
    const source = await readFile(new URL(componentUrl, import.meta.url), 'utf8');
    assert.match(source, /LALARU_BOSS_DIAMETER/, componentUrl);
  }
});

test('summoned dolls derives boss width from the 5 by 5 field and keeps north facing', async () => {
  const source = await readFile(new URL(componentUrls.at(-1), import.meta.url), 'utf8');
  assert.match(source, /LALARU_BOSS_DIAMETER \/ SUMMONED_DOLLS_GRID_SIZE \* 100/);
  assert.match(source, /class="boss-facing"/);
  assert.doesNotMatch(source, /width:\s*29%/);
});
