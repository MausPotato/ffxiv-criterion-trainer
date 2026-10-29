import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('spatial bombs are exposed as the fourth LalaRu route', async () => {
  const router = await readFile(new URL('../../src/router/index.ts', import.meta.url), 'utf8');
  assert.match(router, /path: '\/aloalo-island\/lalaru\/spatial-bombs'/);
  assert.match(router, /name: 'lalaru-spatial-bombs-trainer'/);
});

test('spatial bombs use the shared page shell without rebuilding page layout', async () => {
  const view = await readFile(new URL('../../src/views/LalaRuSpatialBombsTrainerView.vue', import.meta.url), 'utf8');
  assert.match(view, /<TrainerPageShell/);
  assert.match(view, /:navigation="lalaruNavigation"/);
  assert.match(view, /<template #assignment>/);
  assert.match(view, /<template #status>/);
  assert.match(view, /<template[^>]*#actions>/);
  assert.doesNotMatch(view, /class="[^"]*\btrainer-layout\b/);
  assert.doesNotMatch(view, /class="[^"]*\bcontrol-panel\b/);
  assert.doesNotMatch(view, /<RouterLink/);
});

test('spatial arena keeps shared movement and camera controls active during the timeline', async () => {
  const arena = await readFile(new URL('../../src/components/lalaru/LalaRuSpatialBombsArena.vue', import.meta.url), 'utf8');
  assert.match(arena, /useLalaRuArenaInteraction/);
  assert.match(arena, /TrainerCameraControls/);
  assert.match(arena, /props\.phase !== 'dead' && props\.phase !== 'resolved'/);
  assert.match(arena, /@pointerdown="id === 'you' && beginPlayerDrag/);
  assert.match(arena, /cross-explosion/);
  assert.match(arena, /white-orb-impact/);
  assert.match(arena, /\(\) => resetCamera\(\)/);
  assert.doesNotMatch(arena, /resetCamera\(-props\.pattern\.rotation \* 90\)/);
  assert.match(arena, /\.spatial-camera-viewport\.rotating-camera \.spatial-arena \{ transition: none; \}/);
});

test('spatial question starts masked with the shared N/E arena directions', async () => {
  const arena = await readFile(new URL('../../src/components/lalaru/LalaRuSpatialBombsArena.vue', import.meta.url), 'utf8');
  const view = await readFile(new URL('../../src/views/LalaRuSpatialBombsTrainerView.vue', import.meta.url), 'utf8');
  assert.match(arena, /class="cardinal cardinal-north">N</);
  assert.match(arena, /class="cardinal cardinal-east">E</);
  assert.doesNotMatch(arena, /cardinal-south/);
  assert.match(arena, /<TrainerStartOverlay[\s\S]*v-if="phase === 'idle'"/);
  assert.match(arena, /props\.phase !== 'idle'/);
  assert.match(arena, /props\.phase !== 'idle' && props\.phase !== 'lead-in'/);
  assert.match(arena, /v-show="questionVisible"/);
  assert.match(arena, /v-if="questionVisible && \(!removedIds\.has\('white-orb'\)/);
  assert.match(arena, /v-show="questionVisible && \(!removedIds\.has\(bomb\.id\)/);
  assert.match(view, /const questionRevealed = computed/);
  assert.match(view, /<template v-if="questionRevealed">/);
  assert.match(view, /class="assignment-pending">等待提示/);
  assert.match(view, /questionRevealed \? trainer\.remainingLayers\.value\.you : '—'/);
});

test('shared start overlay is fully opaque and fixes icon and button geometry for all four mechanics', async () => {
  const overlay = await readFile(new URL('../../src/components/trainer/TrainerStartOverlay.vue', import.meta.url), 'utf8');
  assert.match(overlay, /trainer-start-rune[^>]*>◇</);
  assert.match(overlay, /width: 128px/);
  assert.match(overlay, /min-height: 52px/);
  assert.match(overlay, /#07131c/);
  assert.doesNotMatch(overlay, /backdrop-filter/);
});

test('spatial arena reuses composite markers, renders cube bombs, and keeps planar teammate styling', async () => {
  const arena = await readFile(new URL('../../src/components/lalaru/LalaRuSpatialBombsArena.vue', import.meta.url), 'utf8');
  assert.match(arena, /class="direction-marker start-marker"/);
  assert.match(arena, /class="direction-marker turn-marker"/);
  assert.match(arena, /class="bomb-cube"/);
  assert.match(arena, /cube-top/);
  assert.match(arena, /cube-left/);
  assert.match(arena, /cube-right/);
  assert.match(arena, /<polygon class="cube-face cube-top"/);
  assert.doesNotMatch(arena, /\.bomb-cube::before/);
  assert.doesNotMatch(arena, /bomb-core/);
  assert.match(arena, /\.spatial-actor\.npc \{ border-color: #95d7ae; background: #24533d; transition: left var\(--npc-move-duration\)/);
  assert.doesNotMatch(arena, /\.spatial-actor \{[^}]*transition:/);
  assert.match(arena, /actorStyle\(position, \.4\)/);
  assert.match(arena, /actorStyle\(LALARU_BOSS_POSITION, \.72\)/);
  assert.match(arena, /border: 3px solid #efc96d/);
  assert.doesNotMatch(arena, /#dca7ff|#492f5d|214, 143, 255/);
  assert.match(arena, /'npc-a': 'A'/);
  assert.match(arena, /'npc-b': 'B'/);
  assert.match(arena, /'npc-c': 'C'/);
});

test('spatial cannon renders the saved boss multiplier above actors through countdown and impact', async () => {
  const arena = await readFile(new URL('../../src/components/lalaru/LalaRuSpatialBombsArena.vue', import.meta.url), 'utf8');
  const view = await readFile(new URL('../../src/views/LalaRuSpatialBombsTrainerView.vue', import.meta.url), 'utf8');
  assert.match(arena, /const showCannon = computed\(\(\) => props\.phase === 'cannon-countdown' \|\| props\.phase === 'cannon-impact'\)/);
  assert.match(arena, /<div v-if="showCannon" class="boss-cannon-cues">/);
  assert.match(arena, /:name="cannonQuestion\.multiplier === 'III' \? 'multiplyIII' : 'multiplyV'"/);
  assert.match(arena, /:arrow-side="cannonQuestion\.arrowSide"/);
  assert.match(arena, /\.boss-cannon-cues \{[^}]*z-index: 19;/);
  assert.ok(
    arena.indexOf('class="boss-cannon-cues"') > arena.indexOf('class="arena-result failure"'),
    'the cannon cue is rendered outside the camera-rotated arena layer'
  );
  assert.doesNotMatch(arena, /class="cannon-countdown"|\.cannon-countdown \{/);
  assert.match(view, /:cannon-question="trainer\.question\.value\.cannon"/);
  assert.match(view, /:cannon-safe-direction="trainer\.cannonSolution\.value\.finalSafeDirection"/);
});

test('spatial quick reference follows the live fixture and keeps multiplication secondary', async () => {
  const sheet = await readFile(new URL('../../src/components/lalaru/LalaRuSpatialBombsCheatSheet.vue', import.meta.url), 'utf8');
  const view = await readFile(new URL('../../src/views/LalaRuSpatialBombsTrainerView.vue', import.meta.url), 'utf8');
  assert.match(sheet, /title="立體炸彈站位小抄"/);
  assert.match(sheet, /spatialStandardPosition\(layer, 0\)/);
  assert.match(sheet, /rotateSpatialPoint\(\{ x: 2\.5, y: 1\.5 \}, 0\)/);
  assert.match(sheet, /rotateSpatialPoint\(\{ x: 2\.5, y: 4\.5 \}, 0\)/);
  assert.match(sheet, /1、2：王腳下/);
  assert.match(sheet, /3、4：向後（題型後方）/);
  assert.match(sheet, /步進 3 上方炸彈結算後移往題型上方/);
  assert.match(sheet, /步進 6 後剩 1 層，移往題型下方/);
  assert.match(sheet, /2、3[\s\S]*?掛機（原位處理），不需額外移動/);
  assert.match(sheet, /圖示固定以題型上／下直向呈現/);
  assert.match(sheet, /不受鏡頭或角色面向影響/);
  assert.match(sheet, /\.spatial-reference-layout \{ display: grid; grid-template-columns: minmax\(112px, \.82fr\) minmax\(0, 1\.18fr\);/);
  assert.match(sheet, /\.position-diagram \{[^}]*max-width: 150px;/);
  assert.match(view, /<LalaRuSpatialBombsCheatSheet[^>]*default-open/);
  assert.match(view, /<LalaRuCheatSheet default-view="boss" :available-views="\['boss'\]"/);
});

test('spatial result is withheld until after the cannon phase', async () => {
  const composable = await readFile(new URL('../../src/composables/useLalaRuSpatialBombsTrainer.ts', import.meta.url), 'utf8');
  assert.match(composable, /schedule\(beginCannon, SPATIAL_BOMBS_TIMING\.cannonAfterFinalBombDelayMs\)/);
  assert.match(composable, /phase\.value = 'cannon-countdown'/);
  assert.match(composable, /phase\.value = 'resolved'/);
  assert.match(composable, /isPointInSafeSector\(playerPosition\.value/);
});

test('spatial death dialog shows only the readable death reason', async () => {
  const view = await readFile(new URL('../../src/views/LalaRuSpatialBombsTrainerView.vue', import.meta.url), 'utf8');
  const deathReason = view.match(/const deathReason = computed\(\(\) => \{[\s\S]*?\n\}\);/)?.[0] ?? '';
  assert.match(deathReason, /return `死因：\$\{death\.reason\}`/);
  assert.doesNotMatch(deathReason, /remainingLayers|position|elapsedMs|toFixed|Math\.round/);
});

test('spatial beta layers use the dedicated cube icons for all four values', async () => {
  const icons = await readFile(new URL('../../src/assets/mechanic-icons.ts', import.meta.url), 'utf8');
  const arena = await readFile(new URL('../../src/components/lalaru/LalaRuSpatialBombsArena.vue', import.meta.url), 'utf8');
  const view = await readFile(new URL('../../src/views/LalaRuSpatialBombsTrainerView.vue', import.meta.url), 'utf8');
  for (const name of ['spatialSubtractionOne', 'spatialSubtractionTwo', 'spatialSubtractionThree', 'spatialSubtractionFour']) {
    assert.match(icons, new RegExp(name));
    assert.match(arena, new RegExp(`MECHANIC_ICONS\\.${name}`));
    assert.match(view, new RegExp(`MECHANIC_ICONS\\.${name}`));
  }
  assert.match(arena, /class="actor-debuff-icon"/);
});

test('spatial party assignment matches the four-column planar teammate row', async () => {
  const view = await readFile(new URL('../../src/views/LalaRuSpatialBombsTrainerView.vue', import.meta.url), 'utf8');
  const assignment = await readFile(new URL('../../src/components/trainer/TrainerPartyAssignment.vue', import.meta.url), 'utf8');
  assert.match(view, /<TrainerPartyAssignment/);
  assert.match(view, /summary="操作角色：YOU"/);
  assert.match(view, /'npc-a': '隊友 A'/);
  assert.match(view, /'npc-b': '隊友 B'/);
  assert.match(view, /'npc-c': '隊友 C'/);
  assert.match(assignment, /class="party-list role-grid"/);
  assert.match(assignment, /class="party-reveal-note"/);
});
