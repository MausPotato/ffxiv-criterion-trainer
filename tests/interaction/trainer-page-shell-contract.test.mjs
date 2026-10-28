import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const viewsDirectory = new URL('../../src/views/', import.meta.url);

// These pages predate TrainerPageShell and are migrated one at a time. Do not add new files here.
const legacyTrainerViews = new Set([
  'KetudukeTrainerView.vue',
  'KetudukeBubblePreviewView.vue'
]);

test('TrainerPageShell exclusively owns the shared page and two-column layout structure', async () => {
  const shell = await readFile(
    new URL('../../src/components/trainer/TrainerPageShell.vue', import.meta.url),
    'utf8'
  );
  const rail = await readFile(
    new URL('../../src/components/trainer/TrainerControlRail.vue', import.meta.url),
    'utf8'
  );
  const rotation = await readFile(
    new URL('../../src/views/LalaRuTrainerView.vue', import.meta.url),
    'utf8'
  );

  assert.match(shell, /<main class="trainer-page trainer-page-shell">/);
  assert.match(shell, /<div class="trainer-heading">/);
  assert.match(shell, /<nav class="mechanic-nav"/);
  assert.match(shell, /<div class="trainer-layout">/);
  assert.match(shell, /<section class="arena-panel panel"/);
  assert.match(rail, /<aside class="control-panel panel trainer-control-stack"/);

  assert.match(rotation, /<TrainerPageShell/);
  assert.doesNotMatch(rotation, /class="[^"]*\btrainer-layout\b/);
  assert.doesNotMatch(rotation, /class="[^"]*\bcontrol-panel\b/);
});
test('TrainerControlRail renders optional regions in the shared contract order', async () => {
  const rail = await readFile(
    new URL('../../src/components/trainer/TrainerControlRail.vue', import.meta.url),
    'utf8'
  );
  const regions = ['settings', 'assignment', 'context', 'status', 'timeline', 'actions', 'review'];
  let previousIndex = -1;

  for (const region of regions) {
    const index = rail.indexOf(`data-trainer-region="${region}"`);
    assert.ok(index > previousIndex, `${region} must follow the preceding TrainerControlRail region`);
    previousIndex = index;
  }
});
test('all migrated LalaRu trainers use the same shell geometry and ordered control regions', async () => {
  const pages = [
    {
      file: 'LalaRuTrainerView.vue',
      regions: ['settings', 'context', 'status', 'actions', 'review']
    },
    {
      file: 'LalaRuAnalysisTrainerView.vue',
      regions: ['settings', 'context', 'status', 'actions']
    },
    {
      file: 'LalaRuPlanarMinesTrainerView.vue',
      regions: ['settings', 'assignment', 'status', 'actions']
    },
    {
      file: 'LalaRuCompositeTrainerView.vue',
      regions: ['settings', 'context', 'status', 'timeline', 'actions']
    },
    {
      file: 'LalaRuSpatialBombsTrainerView.vue',
      regions: ['assignment', 'status', 'actions']
    }
  ];

  for (const page of pages) {
    const source = await readFile(new URL(page.file, viewsDirectory), 'utf8');
    assert.match(source, /<TrainerPageShell/, `${page.file} must use TrainerPageShell`);
    assert.match(source, /:navigation="lalaruNavigation"/, `${page.file} must use central navigation`);
    assert.doesNotMatch(source, /class="[^"]*\btrainer-(?:page|heading|layout)\b/);
    assert.doesNotMatch(source, /class="[^"]*\b(?:arena-panel|control-panel)\b/);
    assert.doesNotMatch(source, /(?:analysis-hud|analysis-actions|preparation-section|planar-control-panel|composite-(?:layout|control-panel|hud|actions)|spatial-(?:layout|control-panel|hud|actions))/);

    let previousIndex = -1;
    for (const region of page.regions) {
      const index = source.indexOf(`#${region}`);
      assert.ok(index > previousIndex, `${page.file} must place ${region} after the preceding region`);
      previousIndex = index;
    }
  }
});
test('the shell visually normalizes the legacy analysis start overlay without changing its arena flow', async () => {
  const shell = await readFile(
    new URL('../../src/components/trainer/TrainerPageShell.vue', import.meta.url),
    'utf8'
  );
  const analysisArena = await readFile(
    new URL('../../src/components/lalaru/LalaRuAnalysisArena.vue', import.meta.url),
    'utf8'
  );
  const analysisView = await readFile(
    new URL('../../src/views/LalaRuAnalysisTrainerView.vue', import.meta.url),
    'utf8'
  );

  assert.match(shell, /\.analysis-start-overlay[\s\S]*?#07131c/);
  assert.match(shell, /\.analysis-start-overlay \.start-button[\s\S]*?width: 128px;[\s\S]*?min-height: 52px;/);
  assert.match(analysisArena, /v-if="phase === 'idle'" class="analysis-start-overlay"/);
  assert.match(analysisArena, /@click="emit\('start'\)"/);
  assert.match(analysisView, /@start="trainer\.start"/);
});

test('composite timeline controls and spatial live interaction stay connected through the shell migration', async () => {
  const composite = await readFile(
    new URL('LalaRuCompositeTrainerView.vue', viewsDirectory),
    'utf8'
  );
  const spatial = await readFile(
    new URL('LalaRuSpatialBombsTrainerView.vue', viewsDirectory),
    'utf8'
  );

  assert.match(composite, /<template v-if="trainer\.mode\.value === 'tutorial'" #timeline>/);
  assert.match(composite, /@click="trainer\.togglePause"/);
  assert.match(composite, /@click="trainer\.stepForward"/);
  assert.match(composite, /@click="trainer\.replay"/);
  assert.match(spatial, /@update-player-position="trainer\.setPlayerPosition"/);
  assert.match(spatial, /@update-player-facing-angle="trainer\.setPlayerFacingAngle"/);
  assert.match(spatial, /:cannon-seconds="trainer\.cannonSeconds\.value"/);
  assert.match(spatial, /:death-record="trainer\.deathRecord\.value"/);
});

test('new trainer views must use TrainerPageShell instead of rebuilding shared layout classes', async () => {
  const files = (await readdir(viewsDirectory))
    .filter(file => file.endsWith('View.vue'));

  for (const file of files) {
    if (legacyTrainerViews.has(file)) continue;
    const source = await readFile(new URL(file, viewsDirectory), 'utf8');
    const isTrainerPage = file.includes('Trainer')
      || source.includes('class="trainer-page')
      || source.includes('<TrainerPageShell');
    if (!isTrainerPage) continue;
    assert.match(source, /<TrainerPageShell/, `${file} must use TrainerPageShell`);
    assert.doesNotMatch(source, /class="[^"]*\btrainer-layout\b/, `${file} must not rebuild trainer-layout`);
    assert.doesNotMatch(source, /class="[^"]*\bcontrol-panel\b/, `${file} must not rebuild control-panel`);
  }
});

test('the central navigation registry preserves visible LalaRu routes and the hidden analysis route', async () => {
  const registry = await readFile(
    new URL('../../src/navigation/trainer-navigation.ts', import.meta.url),
    'utf8'
  );
  const rotation = await readFile(
    new URL('../../src/views/LalaRuTrainerView.vue', import.meta.url),
    'utf8'
  );

  for (const path of [
    '/aloalo-island/lalaru/rotation',
    '/aloalo-island/lalaru/composite-pattern',
    '/aloalo-island/lalaru/planar-mines',
    '/aloalo-island/lalaru/spatial-bombs'
  ]) {
    assert.match(registry, new RegExp(path.replaceAll('/', '\\/')));
  }
  assert.match(registry, /id: 'analysis'[\s\S]*?showInNavigation: false/);
  for (const file of [
    'LalaRuTrainerView.vue',
    'LalaRuAnalysisTrainerView.vue',
    'LalaRuPlanarMinesTrainerView.vue',
    'LalaRuCompositeTrainerView.vue',
    'LalaRuSpatialBombsTrainerView.vue'
  ]) {
    const source = file === 'LalaRuTrainerView.vue'
      ? rotation
      : await readFile(new URL(file, viewsDirectory), 'utf8');
    assert.match(source, /trainerNavigationFor\('lalaru'\)/);
    assert.doesNotMatch(source, /<RouterLink/);
  }
});

test('migrated LalaRu headings omit development status chips', async () => {
  const shell = await readFile(
    new URL('../../src/components/trainer/TrainerPageShell.vue', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(shell, /version(?:-chip|: string)/);

  for (const file of [
    'LalaRuTrainerView.vue',
    'LalaRuCompositeTrainerView.vue',
    'LalaRuPlanarMinesTrainerView.vue',
    'LalaRuSpatialBombsTrainerView.vue'
  ]) {
    const source = await readFile(new URL(file, viewsDirectory), 'utf8');
    assert.doesNotMatch(source, /version=/, `${file} must not provide a status label`);
  }
});

test('visible LalaRu mechanics configure the appropriate quick references', async () => {
  const expectedViews = new Map([
    ['LalaRuTrainerView.vue', 'boss'],
    ['LalaRuCompositeTrainerView.vue', 'player'],
    ['LalaRuPlanarMinesTrainerView.vue', 'player']
  ]);
  for (const [file, view] of expectedViews) {
    const source = await readFile(new URL(file, viewsDirectory), 'utf8');
    assert.match(source, new RegExp(`<LalaRuCheatSheet[^>]*default-view="${view}"`));
  }

  const spatial = await readFile(new URL('LalaRuSpatialBombsTrainerView.vue', viewsDirectory), 'utf8');
  assert.match(spatial, /<LalaRuSpatialBombsCheatSheet default-open \/>/);
  assert.match(spatial, /<LalaRuCheatSheet default-view="boss" :available-views="\['boss'\]" \/>/);
});
