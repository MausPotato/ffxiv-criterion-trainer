import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('planar mines are available as a separate LalaRu route', async () => {
  const router = await readFile(new URL('../../src/router/index.ts', import.meta.url), 'utf8');
  assert.match(router, /path: '\/aloalo-island\/lalaru\/planar-mines'/);
  assert.match(router, /name: 'lalaru-planar-mines-trainer'/);
});

test('planar arena reuses shared camera, drag, keyboard and facing controls', async () => {
  const arena = await readFile(
    new URL('../../src/components/lalaru/LalaRuPlanarMinesArena.vue', import.meta.url),
    'utf8'
  );
  assert.match(arena, /useLalaRuArenaInteraction/);
  assert.match(arena, /TrainerCameraControls/);
  assert.match(arena, /PlayerFacingIndicator/);
  assert.match(arena, /getFacingAngle/);
  assert.match(arena, /updateFacingAngle/);
  assert.match(arena, /beginCameraDrag/);
});

test('strategy selector does not rotate the camera or auto-place the player', async () => {
  const composable = await readFile(
    new URL('../../src/composables/useLalaRuPlanarMinesTrainer.ts', import.meta.url),
    'utf8'
  );
  const setStrategy = composable.match(/function setStrategy[\s\S]*?\n  }/)?.[0] ?? '';
  assert.match(setStrategy, /strategy\.value = next/);
  assert.doesNotMatch(setStrategy, /playerPosition|camera/);
});

test('strategy uses radios beside an always-available resolution animation checkbox', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(view, /class="setting-row"/);
  assert.equal((view.match(/<input\s+type="radio"/g) ?? []).length, 2);
  assert.match(view, /type="checkbox"[\s\S]*@change="trainer\.setShowResolutionAnimation/);
  const animationControl = (view.match(/<label class="switch-row">[\s\S]*?<\/label>/g) ?? [])
    .find(control => control.includes('type="checkbox"')) ?? '';
  assert.doesNotMatch(animationControl, /:disabled=/);
});

test('planar resolution exposes shared animation controls and death feedback without a duplicate resolution panel', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(view, /showResolutionAnimation/);
  assert.match(view, /觀看完整動畫/);
  assert.match(view, /DeathDialog/);
  assert.doesNotMatch(view, /class="resolution-card"|>RESOLUTION</);
});

test('party debuffs are visible before NPC placement is revealed', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  const arena = await readFile(
    new URL('../../src/components/lalaru/LalaRuPlanarMinesArena.vue', import.meta.url),
    'utf8'
  );
  assert.match(view, /v-for="member in trainer\.question\.value\.party"/);
  assert.match(view, /subtractionOne/);
  assert.match(view, /MECHANIC_ICONS\.lalaruStack/);
  assert.match(view, /:show-npcs="trainer\.placementConfirmed\.value"/);
  assert.match(view, /@click="trainer\.confirmPlacement"/);
  assert.match(view, /:disabled="trainer\.phase\.value !== 'preparing' \|\| trainer\.placementConfirmed\.value \|\| !trainer\.placementSelected\.value"/);
  assert.match(arena, /showNpcs \? npcAssignments : \[\]/);
  assert.match(arena, /'npc-a': 'A', 'npc-b': 'B', 'npc-c': 'C'/);
  assert.doesNotMatch(arena, /'npc-a': 'T'|'npc-b': 'H'|'npc-c': 'D2'/);
});

test('planar assignments use four compact player cards with generic teammate labels', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(view, /you: 'YOU', 'npc-a': '隊友 A', 'npc-b': '隊友 B', 'npc-c': '隊友 C'/);
  assert.match(view, /class="party-list role-grid"/);
  assert.match(view, /class="assignment-pending">等待提示/);
});

test('planar HUD shows the same round, success, and streak counters as the first boss', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  const stats = await readFile(
    new URL('../../src/components/trainer/TrainerStats.vue', import.meta.url),
    'utf8'
  );
  assert.match(view, /trainer\.round\.value/);
  assert.match(view, /trainer\.successes\.value/);
  assert.match(view, /trainer\.streak\.value/);
  assert.match(stats, /roundLabel/);
  assert.match(stats, /winsLabel/);
  assert.match(stats, /streakLabel/);
});

test('Ketuduke and planar mines consume the same settings, stats, and stage components', async () => {
  const controls = await readFile(
    new URL('../../src/components/trainer/TrainerControls.vue', import.meta.url),
    'utf8'
  );
  const hud = await readFile(
    new URL('../../src/components/trainer/TrainerHud.vue', import.meta.url),
    'utf8'
  );
  const planar = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(controls, /<TrainerPracticeSettings/);
  assert.match(hud, /<TrainerStats/);
  assert.match(hud, /<TrainerStageCard/);
  assert.match(planar, /<TrainerPracticeSettings/);
  assert.match(planar, /<TrainerStats/);
  assert.match(planar, /<TrainerStageCard/);
});

test('shared trainer presentation components do not import mechanic or composable logic', async () => {
  const files = [
    'TrainerActionRow.vue',
    'TrainerCameraControls.vue',
    'TrainerPracticeSettings.vue',
    'TrainerSegmentedControl.vue',
    'TrainerStats.vue',
    'TrainerStageCard.vue'
  ];
  for (const file of files) {
    const source = await readFile(
      new URL(`../../src/components/trainer/${file}`, import.meta.url),
      'utf8'
    );
    assert.doesNotMatch(source, /mechanics\//);
    assert.doesNotMatch(source, /composables\//);
  }
});

test('planar preparation starts from the arena overlay rather than the control panel', async () => {
  const arena = await readFile(
    new URL('../../src/components/lalaru/LalaRuPlanarMinesArena.vue', import.meta.url),
    'utf8'
  );
  const view = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(arena, /class="planar-start-overlay"/);
  assert.match(arena, /@click="emit\('start'\)"/);
  assert.match(view, /@start="trainer\.start"/);
  assert.doesNotMatch(view, /@click="trainer\.start"/);
});

test('planar controls use the shared practice and preparation cards without debug setup panels', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(view, /<TrainerPracticeSettings/);
  assert.match(view, /<TrainerStats/);
  assert.match(view, /<TrainerStageCard/);
  assert.match(view, /class="setting-row"/);
  assert.match(view, /type="checkbox"/);
  assert.doesNotMatch(view, /class="custom-check"/);
  assert.doesNotMatch(view, /初始化完成|VIDEO-DERIVED TIMING/);
});

test('planar page uses the same compact heading and arena height formula as earlier mechanics', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  const arena = await readFile(
    new URL('../../src/components/lalaru/LalaRuPlanarMinesArena.vue', import.meta.url),
    'utf8'
  );
  const base = await readFile(new URL('../../src/styles/base.css', import.meta.url), 'utf8');
  const heading = view.match(/<div class="trainer-heading planar-heading">[\s\S]*?<\/div>\s*<nav/)?.[0] ?? '';
  assert.doesNotMatch(heading, /section-kicker/);
  assert.match(view, /<main class="trainer-page planar-page">/);
  assert.match(base, /\.trainer-page \{[\s\S]*?height: calc\(100dvh - 72px\)/);
  assert.match(arena, /calc\(100cqh - 58px\)/);
});

test('all LalaRu arena start buttons use the same label', async () => {
  const files = [
    'LalaRuArena.vue',
    'LalaRuCompositeArena.vue',
    'LalaRuAnalysisArena.vue',
    'LalaRuPlanarMinesArena.vue'
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../../src/components/lalaru/${file}`, import.meta.url), 'utf8');
    assert.match(source, /class="primary-button start-button"[^>]*>開始練習<\/button>/);
  }
});

test('forward debuff displays the live shared countdown instead of a fixed 16 seconds', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(view, /class="debuff-countdown">\{\{ trainer\.remainingSeconds\.value \}\}s/);
  assert.doesNotMatch(view, /\{\{ member\.movementDurationSeconds \}\}s/);
});

test('all visible arena actors carry an equally-sized complete debuff strip', async () => {
  const arena = await readFile(
    new URL('../../src/components/lalaru/LalaRuPlanarMinesArena.vue', import.meta.url),
    'utf8'
  );
  const strip = await readFile(
    new URL('../../src/components/lalaru/PlanarActorDebuffs.vue', import.meta.url),
    'utf8'
  );
  assert.equal((arena.match(/<PlanarActorDebuffs/g) ?? []).length, 2);
  assert.match(arena, /:remaining-seconds="remainingSeconds"/);
  assert.match(strip, /remainingLayer/);
  assert.match(strip, /member\.explosionTarget/);
  assert.match(strip, /member\.multiplier/);
  assert.match(strip, /<strong>\{\{ remainingSeconds \}\}<\/strong>/);
  assert.doesNotMatch(strip, /\{\{ remainingSeconds \}\}s/);
  assert.match(strip, /\.debuff-icon img[\s\S]*width: 26px;[\s\S]*height: 26px;/);
});

test('overlapping planar actors stay on their world positions without threshold-based visual jitter', async () => {
  const arena = await readFile(
    new URL('../../src/components/lalaru/LalaRuPlanarMinesArena.vue', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(arena, /overlapsPlayer|actor-overlap-offset|Math\.hypot/);
  assert.match(arena, /transform: translate\(-50%, -50%\)/);
});

test('triggered planar mines disappear after their explosion', async () => {
  const arena = await readFile(
    new URL('../../src/components/lalaru/LalaRuPlanarMinesArena.vue', import.meta.url),
    'utf8'
  );
  assert.match(arena, /\.mine-cell\.triggered \.mine-core \{ opacity: 0;/);
});

test('the active planar attempt can be restarted directly from the control panel', async () => {
  const view = await readFile(
    new URL('../../src/views/LalaRuPlanarMinesTrainerView.vue', import.meta.url),
    'utf8'
  );
  assert.match(view, /:disabled="trainer\.phase\.value === 'idle'"[^>]*@click="trainer\.restart">重新開始練習/);
});
