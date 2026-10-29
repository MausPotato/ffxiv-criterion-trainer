import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const arena = await readFile(new URL('../../src/components/lalaru/LalaRuSummonedDollsArena.vue', import.meta.url), 'utf8');
const view = await readFile(new URL('../../src/views/LalaRuSummonedDollsTrainerView.vue', import.meta.url), 'utf8');

test('summoned dolls uses the existing party cards as an accessible single-role picker', () => {
  assert.match(view, /<button[\s\S]*?v-for="member in trainer\.scenario\.party"/);
  assert.match(view, /:aria-pressed="trainer\.selectedPlayerId\.value === member\.id"/);
  assert.match(view, /@click="trainer\.selectPlayer\(member\.id\)"/);
  assert.doesNotMatch(view, /<select|role-picker|角色選擇/);
  assert.match(arena, /'selected-player': member\.id === selectedPlayerId/);
});

test('summoned dolls reserves responsive space around the square instead of clipping dolls', () => {
  assert.match(arena, /\.dolls-arena-stage[^}]*aspect-ratio:\s*1/);
  assert.match(arena, /\.dolls-arena-shell[^}]*padding:\s*clamp\(/);
  assert.match(arena, /\.dolls-arena-stage[^}]*calc\(100cqh - 106px\)/);
  assert.match(arena, /\.dolls-arena\s*\{[^}]*overflow:\s*visible/);
  assert.doesNotMatch(view, /overflow-y:\s*hidden/);
});
