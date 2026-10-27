import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { trainerNavigationGroupForPath } from '../../src/navigation/trainer-navigation.ts';

test('top navigation identifies every registered trainer route by boss', () => {
  for (const path of [
    '/aloalo-island/ketuduke',
    '/aloalo-island/ketuduke/blowing-bubbles'
  ]) {
    assert.equal(trainerNavigationGroupForPath(path), 'ketuduke', path);
  }
  for (const path of [
    '/aloalo-island/lalaru/rotation',
    '/aloalo-island/lalaru/composite-pattern',
    '/aloalo-island/lalaru/analysis',
    '/aloalo-island/lalaru/planar-mines',
    '/aloalo-island/lalaru/spatial-bombs'
  ]) {
    assert.equal(trainerNavigationGroupForPath(path), 'lalaru', path);
  }
});

test('top navigation does not select a boss on the dungeon home', () => {
  assert.equal(trainerNavigationGroupForPath('/'), null);
});

test('App derives both boss link active states from the navigation registry', async () => {
  const source = await readFile(new URL('../../src/App.vue', import.meta.url), 'utf8');
  assert.match(source, /trainerNavigationGroupForPath\(route\.path\)/);
  assert.match(source, /activeTrainerGroup === 'ketuduke'/);
  assert.match(source, /activeTrainerGroup === 'lalaru'/);
});
