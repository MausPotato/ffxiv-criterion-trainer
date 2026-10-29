import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const componentDirectory = new URL('../../src/components/lalaru/', import.meta.url);
const viewDirectory = new URL('../../src/views/', import.meta.url);

const arenas = [
  ['LalaRuArena.vue', '開始後觀察王的旋轉提示，再移動至安全區。'],
  ['LalaRuCompositeArena.vue', '開始後先預覽步進路線，再處理光球、王炮與缺口。'],
  ['LalaRuPlanarMinesArena.vue', '開始後取得 Debuff，在倒數內完成站位與面向調整。'],
  ['LalaRuSpatialBombsArena.vue', '開始後揭示配置，沿步進路線持續移動並避開爆炸。']
];

test('all four mechanic overlays provide one consistent opening reminder', async () => {
  for (const [file, description] of arenas) {
    const source = await readFile(new URL(file, componentDirectory), 'utf8');
    assert.match(source, /<TrainerStartOverlay/);
    assert.match(source, new RegExp(`description="${description}"`));
    assert.match(source, /@start="emit\('start'\)"/);
  }
});

test('camera controls reserve their layout slot but render no focusable controls before start', async () => {
  const controls = await readFile(
    new URL('../../src/components/trainer/TrainerCameraControls.vue', import.meta.url),
    'utf8'
  );
  assert.match(controls, /visible\?: boolean/);
  assert.match(controls, /<div class="camera-control-slot">[\s\S]*?<div v-if="visible" class="camera-control-group">/);
  assert.match(controls, /resetLabel: '重置視角'/);
  assert.match(controls, /instructions: '右鍵拖曳調整視角'/);
  assert.match(controls, /\.camera-control-slot \{[\s\S]*?min-height: 66px;/);

  for (const [file] of arenas) {
    const source = await readFile(new URL(file, componentDirectory), 'utf8');
    assert.match(source, /<TrainerCameraControls[\s\S]*?:visible="phase !== 'idle'"/);
    assert.match(source, /canRotateCamera: \(\) => props\.phase !== 'idle'/);
    assert.doesNotMatch(source, /reset-label=/);
    assert.doesNotMatch(source, /instructions=/);
  }
});

test('the arena overlay is the only idle start entry for all four mechanics', async () => {
  for (const file of [
    'LalaRuTrainerView.vue',
    'LalaRuCompositeTrainerView.vue',
    'LalaRuPlanarMinesTrainerView.vue',
    'LalaRuSpatialBombsTrainerView.vue'
  ]) {
    const source = await readFile(new URL(file, viewDirectory), 'utf8');
    assert.doesNotMatch(source, /v-if="trainer\.phase\.value === 'idle'"[^>]*@click="trainer\.start"/);
  }

  const planar = await readFile(new URL('LalaRuPlanarMinesTrainerView.vue', viewDirectory), 'utf8');
  assert.match(planar, /'確認我的站位'/);
  assert.match(planar, />重新開始練習<\/button>/);
  const composite = await readFile(new URL('LalaRuCompositeTrainerView.vue', viewDirectory), 'utf8');
  assert.match(composite, />從頭重播</);
});

test('all LalaRu stage cards share the waiting copy and muted clock presentation', async () => {
  const visibleViews = [
    'LalaRuTrainerView.vue',
    'LalaRuCompositeTrainerView.vue',
    'LalaRuPlanarMinesTrainerView.vue',
    'LalaRuSpatialBombsTrainerView.vue'
  ];

  for (const file of visibleViews) {
    const source = await readFile(new URL(file, viewDirectory), 'utf8');
    assert.match(source, /'待開始'/, `${file} must use the shared waiting label`);
    assert.match(source, /'準備就緒'/, `${file} must avoid repeating the waiting label`);
    assert.match(source, /:clock-tone="trainer\.phase\.value === 'idle' \? 'muted' : 'default'"/);
    assert.doesNotMatch(source, /Ⅱ WAITING|return 'WAITING'/);
  }
});

test('all four mechanics share localized final result labels', async () => {
  const resultLabels = await readFile(
    new URL('../../src/presentation/trainer-result.ts', import.meta.url),
    'utf8'
  );
  assert.match(resultLabels, /succeeded \? '成功' : '失敗'/);
  assert.match(resultLabels, /succeeded \? '✓ 成功' : '× 失敗'/);

  for (const [file] of arenas) {
    const source = await readFile(new URL(file, componentDirectory), 'utf8');
    assert.match(source, /trainerResultLabel/);
    assert.doesNotMatch(source, />\s*(?:SAFE|HIT|BLEEDING|KO|CLEAR|FAILED)\s*</);
  }

  for (const file of [
    'LalaRuTrainerView.vue',
    'LalaRuCompositeTrainerView.vue',
    'LalaRuPlanarMinesTrainerView.vue',
    'LalaRuSpatialBombsTrainerView.vue'
  ]) {
    const source = await readFile(new URL(file, viewDirectory), 'utf8');
    assert.match(source, /trainerResultStatus/);
    assert.doesNotMatch(source, /['"](?:✓ COMPLETE|× FAILED|COMPLETE|FAILED)['"]/);
  }
});
