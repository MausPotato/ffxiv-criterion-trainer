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
    new URL('../../src/views/LalaRuTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(source, /\.lalaru-page \{[^}]*user-select: none;[^}]*-webkit-user-select: none;/);
});

test('cheat sheet visibility can be toggled without changing trainer state', async () => {
  const source = await readFile(
    new URL('../../src/views/LalaRuTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(source, /const showCheatSheet = ref\(true\)/);
  assert.match(source, /@click="showCheatSheet = !showCheatSheet"/);
  assert.match(source, /<LalaRuCheatSheet id="lalaru-cheat-sheet" v-show="showCheatSheet"/);
});

test('desktop LalaRu layout is viewport-bound without a page Y scrollbar', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuTrainerView.vue', import.meta.url),
    'utf8'
  );
  const base = await readFile(new URL('../../src/styles/base.css', import.meta.url), 'utf8');
  assert.match(view, /<main class="trainer-page lalaru-page">/);
  assert.match(base, /\.trainer-page \{[^}]*height: calc\(100dvh - 72px\);[^}]*overflow: hidden;/);
  assert.match(base, /@media \(max-width: 760px\)[\s\S]*?\.trainer-page \{[^}]*height: auto;[^}]*overflow: visible;/);
});

test('cheat sheet uses the 三沒五有 mnemonic and explicit V wording', async () => {
  const source = await readFile(
    new URL('../../src/components/lalaru/LalaRuCheatSheet.vue', import.meta.url),
    'utf8'
  );
  assert.match(source, /<span>三沒五有<\/span>/);
  assert.match(source, /看<strong class="rule-keyword">\{\{ rule\.keyword \}\}<\/strong>箭頭那邊/);
  assert.match(source, /\.rule-copy strong\.rule-keyword \{ color: #ff4f58; font-weight: 900; \}/);
});
