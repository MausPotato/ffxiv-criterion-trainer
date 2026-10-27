import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('tutorial answer review is gated behind settlement and tutorial mode', async () => {
  const source = await readFile(
    new URL('../../src/views/LalaRuTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(
    source,
    /v-if="trainer\.phase\.value === 'resolved' && trainer\.mode\.value === 'tutorial'"[\s\S]*?class="tutorial-breakdown"/
  );
});

test('arena does not render a final safe overlay before resolution', async () => {
  const source = await readFile(
    new URL('../../src/components/lalaru/LalaRuArena.vue', import.meta.url),
    'utf8'
  );
  assert.match(
    source,
    /v-if="phase === 'resolved' && mode === 'tutorial'" class="tutorial-safe-sectors"/
  );
});

test('LalaRu page suppresses context menus globally and cleans the listener on unmount', async () => {
  const source = await readFile(
    new URL('../../src/views/LalaRuTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(source, /onMounted\(\(\) => document\.addEventListener\('contextmenu', preventContextMenu\)\)/);
  assert.match(source, /onBeforeUnmount\(\(\) => document\.removeEventListener\('contextmenu', preventContextMenu\)\)/);
});

test('LalaRu page prevents text selection during camera dragging', async () => {
  const source = await readFile(
    new URL('../../src/components/trainer/TrainerPageShell.vue', import.meta.url),
    'utf8'
  );
  assert.match(source, /\.trainer-page-shell \{[^}]*user-select: none;[^}]*-webkit-user-select: none;/);
});

test('cheat sheet is a self-contained collapsible reference', async () => {
  const source = await readFile(
    new URL('../../src/components/lalaru/LalaRuCheatSheet.vue', import.meta.url),
    'utf8'
  );
  assert.match(source, /<details class="cheat-sheet" :open="defaultOpen">/);
  assert.match(source, /defaultOpen: false/);
  assert.doesNotMatch(source, /trainer\./);
});

test('desktop LalaRu layout is viewport-bound without a page Y scrollbar', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuTrainerView.vue', import.meta.url),
    'utf8'
  );
  const base = await readFile(new URL('../../src/styles/base.css', import.meta.url), 'utf8');
  assert.match(view, /<TrainerPageShell/);
  assert.match(base, /\.trainer-page \{[^}]*height: calc\(100dvh - 72px\);[^}]*overflow: hidden;/);
  assert.match(base, /@media \(max-width: 760px\)[\s\S]*?\.trainer-page \{[^}]*height: auto;[^}]*overflow: visible;/);
});

test('cheat sheet separates boss safety and player pre-facing viewpoints', async () => {
  const source = await readFile(
    new URL('../../src/components/lalaru/LalaRuCheatSheet.vue', import.meta.url),
    'utf8'
  );
  assert.match(source, /defaultView: 'boss'/);
  assert.match(source, /'王・三沒五有'/);
  assert.match(source, /'玩家・三有五沒'/);
  assert.match(source, /看<strong class="rule-keyword">\{\{ rule\.keyword \}\}<\/strong>箭頭那邊/);
  assert.match(source, /旋轉前面向<strong class="rule-keyword">\{\{ rule\.keyword \}\}<\/strong>箭頭側/);
  assert.match(source, /白箭頭標示旋轉前的角色面向；乘算仍使用同一套旋轉規則。/);
  assert.match(source, /\.rule-copy strong\.rule-keyword \{ color: #ff4f58; font-weight: 900; \}/);
});
