import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('battle mode does not receive the tutorial route preview class', async () => {
  const source = await readFile(
    new URL('../../src/components/lalaru/LalaRuCompositeArena.vue', import.meta.url),
    'utf8'
  );
  assert.match(source, /'route-preview': mode === 'tutorial' && phase !== 'idle' && phase !== 'analysis-lead'/);
  assert.doesNotMatch(source, /final-safe|safe-overlay/);
  assert.match(source, /attackSectorPath\(bossDisplayedSafeDirection\.value\)/);
  assert.match(source, /bossCannonState === 'telegraph' \|\| bossCannonState === 'resolving'/);
  assert.match(source, /v-show="phase !== 'idle' && phase !== 'analysis-lead'"/);
  assert.match(source, /v-show="phase !== 'idle' && phase !== 'analysis-lead' && \(!explodedIds\.has\(orb\.id\)/);
  assert.match(source, /<AnalysisRing[\s\S]*?v-if="phase !== 'idle'"/);
  assert.match(source, /v-if="phase !== 'idle'" class="analysis-debuff-badge"/);
  assert.match(source, /AnalysisRing/);
  assert.match(source, /analysisDebuff/);
  assert.doesNotMatch(source, /analysisLabels/);
  assert.doesNotMatch(source, /正面未解析|背面未解析|左側未解析|右側未解析/);
});

test('composite analysis text stays unidentified until tutorial settlement', async () => {
  const source = await readFile(
    new URL('../../src/views/LalaRuCompositeTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(source, /mode\.value === 'tutorial' && trainer\.phase\.value === 'resolved'/);
  assert.match(source, /: '未解析'/);
});

test('composite orb analysis reuses the independent analysis collision function', async () => {
  const source = await readFile(
    new URL('../../src/composables/useLalaRuCompositeTrainer.ts', import.meta.url),
    'utf8'
  );
  assert.match(source, /isAttackInAnalysisGap/);
  assert.match(source, /orbAnalysisResults/);
  assert.match(source, /triggerOrbs\(activeCells\.value/);
});

test('composite death feedback reuses the shared YOU DIED dialog and keeps camera controls available', async () => {
  const arena = await readFile(
    new URL('../../src/components/lalaru/LalaRuCompositeArena.vue', import.meta.url),
    'utf8'
  );
  const view = await readFile(
    new URL('../../src/views/LalaRuCompositeTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(arena, /phase !== 'resolved' && props\.phase !== 'dead'/);
  assert.match(arena, /phase === 'dead' && deathRecord/);
  assert.match(arena, /camera-controls/);
  assert.match(arena, /watch\(\(\) => props\.cameraResetKey/);
  assert.match(view, /import DeathDialog from/);
  assert.match(view, /<DeathDialog/);
  assert.match(view, /:open="deathDialogOpen"/);
  assert.match(view, /`死因：\$\{trainer\.deathRecord\.value\.reason\}`/);
  assert.match(view, /重試同一題/);
  assert.doesNotMatch(view, /判定詳情/);
});

test('all LalaRu arenas use the shared camera and player interaction logic', async () => {
  const firstArena = await readFile(
    new URL('../../src/components/lalaru/LalaRuArena.vue', import.meta.url),
    'utf8'
  );
  const compositeArena = await readFile(
    new URL('../../src/components/lalaru/LalaRuCompositeArena.vue', import.meta.url),
    'utf8'
  );
  const analysisArena = await readFile(
    new URL('../../src/components/lalaru/LalaRuAnalysisArena.vue', import.meta.url),
    'utf8'
  );
  assert.match(firstArena, /useLalaRuArenaInteraction/);
  assert.match(compositeArena, /useLalaRuArenaInteraction/);
  assert.match(analysisArena, /useLalaRuArenaInteraction/);
  for (const source of [firstArena, compositeArena, analysisArena]) {
    assert.match(source, /PlayerFacingIndicator/);
    assert.match(source, /TrainerCameraControls/);
    assert.match(source, /getFacingAngle/);
    assert.match(source, /updateFacingAngle/);
  }
});

test('LalaRu control panels reuse the shared first-boss settings, status, stats, and action components', async () => {
  const files = [
    'LalaRuTrainerView.vue',
    'LalaRuCompositeTrainerView.vue',
    'LalaRuAnalysisTrainerView.vue'
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../../src/views/${file}`, import.meta.url), 'utf8');
    assert.match(source, /TrainerPracticeSettings/);
    assert.match(source, /TrainerStageCard/);
    assert.match(source, /TrainerStats/);
    assert.match(source, /TrainerActionRow/);
  }
});

test('composite pattern is exposed as an independent LalaRu practice route', async () => {
  const source = await readFile(new URL('../../src/router/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path: '\/aloalo-island\/lalaru\/composite-pattern'/);
  assert.match(source, /name: 'lalaru-composite-pattern-trainer'/);
});

test('analysis is exposed as an independent LalaRu practice route', async () => {
  const source = await readFile(new URL('../../src/router/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path: '\/aloalo-island\/lalaru\/analysis'/);
  assert.match(source, /name: 'lalaru-analysis-trainer'/);
});

test('LalaRu local navigation contains only LalaRu mechanics', async () => {
  const firstView = await readFile(
    new URL('../../src/views/LalaRuTrainerView.vue', import.meta.url),
    'utf8'
  );
  const compositeView = await readFile(
    new URL('../../src/views/LalaRuCompositeTrainerView.vue', import.meta.url),
    'utf8'
  );
  const analysisView = await readFile(
    new URL('../../src/views/LalaRuAnalysisTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(firstView, /mechanic-nav[\s\S]*?aloalo-island\/ketuduke/);
  assert.doesNotMatch(compositeView, /mechanic-nav[\s\S]*?aloalo-island\/ketuduke/);
  assert.doesNotMatch(analysisView, /mechanic-nav[\s\S]*?aloalo-island\/ketuduke/);
  assert.doesNotMatch(firstView, /<RouterLink[^>]+to="\/aloalo-island\/lalaru\/analysis"/);
  assert.doesNotMatch(compositeView, /<RouterLink[^>]+to="\/aloalo-island\/lalaru\/analysis"/);
  assert.doesNotMatch(analysisView, /<RouterLink[^>]+to="\/aloalo-island\/lalaru\/analysis"/);
});

test('Ketuduke and both LalaRu pages share the same desktop page width and column ratio', async () => {
  const base = await readFile(new URL('../../src/styles/base.css', import.meta.url), 'utf8');
  const firstView = await readFile(
    new URL('../../src/views/LalaRuTrainerView.vue', import.meta.url),
    'utf8'
  );
  const compositeView = await readFile(
    new URL('../../src/views/LalaRuCompositeTrainerView.vue', import.meta.url),
    'utf8'
  );
  const analysisView = await readFile(
    new URL('../../src/views/LalaRuAnalysisTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(base, /\.trainer-page \{[\s\S]*?width: min\(1440px, calc\(100% - 40px\)\)/);
  assert.match(base, /\.trainer-layout \{[\s\S]*?grid-template-columns: minmax\(0, 1\.08fr\) minmax\(420px, \.92fr\)/);
  for (const source of [firstView, compositeView, analysisView]) {
    assert.match(source, /<main class="trainer-page /);
    assert.match(source, /<div class="trainer-layout /);
  }
});

test('composite pattern does not expose a manual safe-band selector', async () => {
  const source = await readFile(
    new URL('../../src/views/LalaRuCompositeTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(source, /安全帶方向|setOrientation/);
  assert.match(source, /trainer\.nextQuestion/);
});
