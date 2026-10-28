import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('home navigation hides boss links while trainer pages preserve them', async () => {
  const source = await readFile(new URL('../../src/App.vue', import.meta.url), 'utf8');
  assert.match(source, /const isHome = computed\(\(\) => route\.path === '\/'\)/);
  assert.match(source, /<RouterLink to="\/">迷宮一覽<\/RouterLink>/);
  assert.equal(source.match(/v-if="!isHome"/g)?.length, 2);
  assert.match(source, /v-if="!isHome"[\s\S]*?to="\/aloalo-island\/ketuduke"/);
  assert.match(source, /v-if="!isHome"[\s\S]*?to="\/aloalo-island\/lalaru\/rotation"/);
});

test('home hero promotes the trainer description and keeps the requested study note', async () => {
  const source = await readFile(new URL('../../src/views/HomeView.vue', import.meta.url), 'utf8');
  assert.match(source, /hero-title-lead">FF14 異聞迷宮單人演練工具/);
  assert.match(source, /hero-title-accent">在不影響隊友的情況下反覆熟悉站位/);
  assert.match(source, /<p class="hero-copy">今天也要愉快的讀書ᕕ \( ᐛ \) ᕗ<\/p>/);
  assert.doesNotMatch(source, /把機制拆成一步一步|練到判斷成為直覺/);
});

test('home hero keeps the lead size while reducing the accent and desktop vertical footprint', async () => {
  const base = await readFile(new URL('../../src/styles/base.css', import.meta.url), 'utf8');
  const home = await readFile(new URL('../../src/views/HomeView.vue', import.meta.url), 'utf8');
  assert.match(base, /\.hero h1 \{[\s\S]*?font-size: clamp\(34px, 5\.2vw, 64px\);/);
  assert.match(base, /\.hero-title-accent \{[\s\S]*?font-size: \.7em;[\s\S]*?line-height: 1\.25;/);
  assert.match(base, /\.hero \{[\s\S]*?padding: clamp\(42px, 6vh, 64px\) 0 clamp\(38px, 5vh, 54px\);/);
  assert.match(base, /\.dungeon-card \{[\s\S]*?min-height: 320px;/);
  assert.match(home, /\.dungeon-card\.has-secondary-action \{\s*min-height: 320px;/);
  assert.doesNotMatch(base, /\.home-page[^}]*overflow-y:\s*hidden/);
});
