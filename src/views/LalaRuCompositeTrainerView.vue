<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import LalaRuCompositeArena from '../components/lalaru/LalaRuCompositeArena.vue';
import DeathDialog from '../components/trainer/DeathDialog.vue';
import { useLalaRuCompositeTrainer } from '../composables/useLalaRuCompositeTrainer.ts';
import {
  COMPOSITE_ROUTE_LENGTH,
  COMPOSITE_TIMING,
  type AnalysisDebuff
} from '../mechanics/lalaru/index.ts';
import { MECHANIC_ICONS, type MechanicIconName } from '../assets/mechanic-icons.ts';

const trainer = useLalaRuCompositeTrainer();
const deathDialogOpen = ref(false);
const analysisLabels: Readonly<Record<AnalysisDebuff, string>> = {
  front: '正面未解析', back: '背面未解析', left: '左側未解析', right: '右側未解析'
};
const analysisIconNames: Readonly<Record<AnalysisDebuff, MechanicIconName>> = {
  front: 'analysisFront', back: 'analysisBack', left: 'analysisLeft', right: 'analysisRight'
};
const latestAnalysisResult = computed(() => trainer.orbAnalysisResults.value.at(-1) ?? null);
const analysisSourceLabels = {
  'orb-a': '光球 1',
  'orb-b': '光球 2',
  'boss-high-precision': '高精度光彈'
} as const;
const deathDialogReason = computed(() => trainer.deathRecord.value
  ? `死因：${trainer.deathRecord.value.reason}`
  : '');
const resolvedSummary = computed(() => {
  if (trainer.succeeded.value) return '安全';
  const reasons: string[] = [];
  if (trainer.dangerFloorFailed.value) reasons.push('踩入危險地板');
  if (trainer.bossCannonSucceeded.value === false) reasons.push('魔紋砲命中');
  if (trainer.analysisFailed.value) reasons.push('分析方向錯誤');
  return reasons.join('＋') || '失敗';
});
watch(() => trainer.deathRecord.value, record => {
  deathDialogOpen.value = record !== null;
});
function retryQuestion(): void {
  deathDialogOpen.value = false;
  trainer.retry();
}
function nextQuestion(): void {
  deathDialogOpen.value = false;
  trainer.nextQuestion();
}
const preventContextMenu = (event: MouseEvent): void => event.preventDefault();
onMounted(() => document.addEventListener('contextmenu', preventContextMenu));
onBeforeUnmount(() => document.removeEventListener('contextmenu', preventContextMenu));
</script>

<template>
  <main class="composite-page">
    <div class="composite-heading">
      <div>
        <RouterLink class="back-link" to="/">← 回到迷宮一覽</RouterLink>
        <h1>拉拉魯｜複合魔紋</h1>
        <p>避開步進地板，並調整面向讓兩次光球攻擊進入 C 字缺口。</p>
      </div>
      <span class="version-chip">SECOND MECHANIC · PHASE 1</span>
    </div>

    <nav class="mechanic-nav" aria-label="拉拉魯機制選擇">
      <RouterLink to="/aloalo-island/lalaru/rotation">旋轉角乘算</RouterLink>
      <RouterLink class="active" to="/aloalo-island/lalaru/composite-pattern">複合魔紋</RouterLink>
    </nav>

    <div class="composite-layout">
      <section class="panel composite-arena-panel">
        <LalaRuCompositeArena
          :phase="trainer.phase.value"
          :mode="trainer.mode.value"
          :paused="trainer.paused.value"
          :pattern="trainer.pattern.value"
          :player-position="trainer.playerPosition.value"
          :player-facing-angle="trainer.playerFacingAngle.value"
          :player-gap-rotation-degrees="trainer.playerGapRotationDegrees.value"
          :analysis-debuff="trainer.analysisDebuff.value"
          :orb-analysis-results="trainer.orbAnalysisResults.value"
          :high-precision-result="trainer.highPrecisionResult.value"
          :high-precision-impact-key="trainer.highPrecisionImpactKey.value"
          :boss-question="trainer.bossQuestion.value"
          :boss-final-safe-direction="trainer.bossSolution.value.finalSafeDirection"
          :boss-cannon-state="trainer.bossCannonState.value"
          :boss-dot-count="trainer.bossDotCount.value"
          :boss-animation-key="trainer.bossAnimationKey.value"
          :player-rotation-cue="trainer.playerRotationCue.value"
          :player-rotation-state="trainer.playerRotationState.value"
          :player-rotation-dot-count="trainer.playerRotationDotCount.value"
          :player-rotation-animation-key="trainer.playerRotationAnimationKey.value"
          :current-step="trainer.currentStep.value"
          :active-cells="trainer.activeCells.value"
          :dangerous-cells="trainer.dangerousCells.value"
          :exploded-orb-ids="trainer.explodedOrbIds.value"
          :exploding-orb-ids="trainer.explodingOrbIds.value"
          :explosion-key="trainer.explosionKey.value"
          :death-record="trainer.deathRecord.value"
          :camera-reset-key="trainer.cameraResetKey.value"
          :succeeded="trainer.succeeded.value"
          @start="trainer.start"
          @update-player-position="trainer.setPlayerPosition"
          @update-player-facing-angle="trainer.setPlayerFacingAngle"
        />
      </section>

      <aside class="panel composite-control-panel">
        <section>
          <p class="section-kicker">TRAINING MODE</p>
          <h2>練習設定</h2>
          <div class="two-way-switch" role="group" aria-label="練習模式">
            <button type="button" :class="{ active: trainer.mode.value === 'tutorial' }" @click="trainer.setMode('tutorial')">教學模式</button>
            <button type="button" :class="{ active: trainer.mode.value === 'battle' }" @click="trainer.setMode('battle')">實戰模式</button>
          </div>
          <p class="mode-description">{{ trainer.mode.value === 'tutorial' ? '顯示完整路線、危險地板及光球分析角度。' : '只顯示實際箭頭、光球、C 字環與 AoE 演出。' }}</p>
        </section>

        <section class="composite-analysis-panel">
          <div class="analysis-heading-row">
            <img v-if="trainer.phase.value !== 'idle'" :src="MECHANIC_ICONS[analysisIconNames[trainer.analysisDebuff.value]]" alt="" />
            <span v-else class="analysis-icon-placeholder" aria-hidden="true"></span>
            <div><p class="section-kicker">ANALYSIS DEBUFF</p><h2>{{ trainer.phase.value === 'idle' ? '尚未賦予' : trainer.mode.value === 'tutorial' && trainer.phase.value === 'resolved' ? analysisLabels[trainer.analysisDebuff.value] : '未解析' }}</h2></div>
            <strong>{{ trainer.analysisResults.value.length }} / 3</strong>
          </div>
          <p class="mode-description">使用 WASD／方向鍵移動，Q／E 原地轉向；每顆球都會獨立檢查缺口。</p>
          <div v-if="trainer.mode.value === 'tutorial' && trainer.analysisResults.value.length" class="analysis-result-list">
            <div v-for="result in trainer.analysisResults.value" :key="result.source" :class="result.succeeded ? 'success' : 'failure'">
              <strong>{{ analysisSourceLabels[result.source] }} · {{ result.succeeded ? '通過' : '方向錯誤' }}</strong>
              <span>來源 {{ result.sourceAngle === null ? '重疊' : `${Math.round(result.sourceAngle)}°` }}／缺口 {{ Math.round(result.gapCenterAngle) }}°<template v-if="result.gapRotationDegrees">（偏移 {{ result.gapRotationDegrees > 0 ? '+' : '' }}{{ result.gapRotationDegrees }}°）</template></span>
            </div>
          </div>
          <p v-else-if="trainer.mode.value === 'tutorial'" class="analysis-waiting">等待光球被步進 AoE 觸發。</p>
          <p v-else-if="latestAnalysisResult" class="analysis-battle-count">已完成 {{ trainer.analysisResults.value.length }} / 3 次分析判定</p>
        </section>

        <section class="composite-status-card" aria-live="polite">
          <div class="status-heading">
            <span>{{ trainer.phase.value.toUpperCase() }}</span>
            <strong v-if="trainer.paused.value">已暫停</strong>
            <strong v-else-if="trainer.phase.value === 'analysis-lead'">分析賦予・T0 前</strong>
            <strong v-else-if="trainer.phase.value === 'preview'">預覽 {{ COMPOSITE_TIMING.previewDurationMs / 1000 }} 秒</strong>
            <strong v-else-if="trainer.phase.value === 'stepping'">步進 {{ trainer.routeCellNumber.value }} / {{ COMPOSITE_ROUTE_LENGTH }}</strong>
            <strong v-else-if="trainer.phase.value === 'player-rotation'">玩家旋轉角乘算</strong>
            <strong v-else-if="trainer.phase.value === 'high-precision'">高精度光彈準備</strong>
            <strong v-else-if="trainer.phase.value === 'dead'" class="failure">死亡</strong>
            <strong v-else-if="trainer.phase.value === 'resolved'" :class="trainer.succeeded.value ? 'success' : 'failure'">{{ resolvedSummary }}</strong>
            <strong v-else>等待開始</strong>
          </div>
          <div v-if="trainer.phase.value === 'preview' && !trainer.paused.value" class="preview-progress"><span :style="{ '--preview-duration': `${COMPOSITE_TIMING.previewDurationMs}ms` }"></span></div>
          <dl class="status-grid">
            <div><dt>危險格</dt><dd>{{ trainer.dangerousCells.value.length }} / 20</dd></div>
            <div><dt>光球爆炸</dt><dd>{{ trainer.explosionCount.value }} / 2</dd></div>
            <div><dt>魔紋砲</dt><dd>{{ trainer.bossCannonState.value === 'hidden' ? '—' : trainer.bossCannonState.value === 'waiting' ? '光球爆炸中' : trainer.bossCannonState.value === 'resolved' ? (trainer.bossCannonSucceeded.value ? '通過' : '命中') : trainer.bossCannonState.value === 'resolving' ? '結算' : '預兆' }}</dd></div>
            <div><dt>缺口偏移</dt><dd>{{ trainer.playerRotationState.value === 'applied' ? `${trainer.playerGapRotationDegrees.value > 0 ? '+' : ''}${trainer.playerGapRotationDegrees.value}°` : '尚未乘算' }}</dd></div>
            <div><dt>下次步進</dt><dd>{{ trainer.paused.value || !trainer.nextStepInMs.value ? '—' : `${trainer.nextStepInMs.value / 1000}s` }}</dd></div>
          </dl>
        </section>

        <section v-if="trainer.mode.value === 'tutorial'">
          <p class="section-kicker">TIMELINE CONTROL</p>
          <h2>動畫檢查</h2>
          <div class="control-grid">
            <button class="secondary-button" type="button" :disabled="trainer.phase.value === 'idle' || trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'" @click="trainer.togglePause">{{ trainer.paused.value ? '繼續' : '暫停' }}</button>
            <button class="secondary-button" type="button" :disabled="trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'" @click="trainer.stepForward">逐步播放</button>
            <button class="secondary-button wide" type="button" @click="trainer.replay">從頭重播</button>
          </div>
        </section>

        <section class="composite-actions">
          <div class="score-line"><span>完成 {{ trainer.attempts.value }}</span><span>成功 {{ trainer.successes.value }}</span></div>
          <button v-if="trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'" class="secondary-button" type="button" @click="trainer.retry">重試同一題</button>
          <button v-if="trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'" class="primary-button" type="button" @click="trainer.nextQuestion">下一題</button>
          <button v-if="trainer.phase.value === 'idle'" class="primary-button wide" type="button" @click="trainer.start">開始</button>
        </section>
      </aside>
    </div>

    <DeathDialog
      :open="deathDialogOpen"
      :reason="deathDialogReason"
      @close="deathDialogOpen = false"
      @retry="retryQuestion"
      @next="nextQuestion"
    />
  </main>
</template>

<style scoped>
.composite-page { display: flex; width: min(1440px, calc(100% - 40px)); height: calc(100dvh - 72px); max-height: calc(100dvh - 72px); margin: 0 auto; padding: 8px 0; flex-direction: column; overflow: hidden; user-select: none; -webkit-user-select: none; }
.composite-heading { display: flex; align-items: end; justify-content: space-between; flex: 0 0 auto; gap: 20px; margin-bottom: 6px; }
.composite-heading h1 { margin: 2px 0 0; font-size: var(--type-page-title); letter-spacing: -.025em; line-height: 1.15; }
.composite-heading > div > p:last-child { margin: 0; color: var(--text-helper); font-size: var(--type-body); line-height: var(--leading-compact); }
.back-link { display: inline-block; margin-bottom: 8px; color: #9ec5d2; font-size: 13px; text-decoration: none; }
.mechanic-nav { display: flex; flex: 0 0 auto; gap: 7px; margin: 0 0 7px; }
.mechanic-nav a { padding: 5px 10px; border: 1px solid var(--line-soft); border-radius: 999px; color: var(--text-secondary); background: #101c27; font-size: var(--type-secondary); text-decoration: none; }
.mechanic-nav a.active { border-color: #4dbbd3; color: #e8fbff; background: #173d49; }
.composite-layout { display: grid; min-height: 0; flex: 1 1 auto; grid-template-columns: minmax(0, 1.08fr) minmax(420px, .92fr); gap: 11px; align-items: stretch; overflow: hidden; }
.composite-arena-panel { display: grid; height: 100%; min-height: 0; min-width: 0; padding: 10px; overflow: hidden; place-items: center; container-type: size; }
.composite-control-panel { display: flex; height: 100%; min-width: 0; flex-direction: column; gap: 12px; padding: 12px; overflow-y: auto; scrollbar-width: none; }
.composite-control-panel::-webkit-scrollbar { display: none; }
.composite-control-panel section + section { padding-top: 13px; border-top: 1px solid var(--line-soft); }
.composite-control-panel h2 { margin: 0; font-size: 19px; }
.two-way-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 10px; }
.two-way-switch button { padding: 9px; border: 1px solid #3b5363; border-radius: 8px; color: #b9cad3; background: #101c27; cursor: pointer; }
.two-way-switch button.active { border-color: #5ccbe2; color: #eafcff; background: #1a4655; }
.mode-description { margin: 8px 0 0; color: var(--text-helper); font-size: 13px; line-height: 1.55; }
.analysis-heading-row { display: grid; grid-template-columns: 32px 1fr auto; gap: 9px; align-items: center; }
.analysis-heading-row img { width: 24px; height: 32px; }
.analysis-icon-placeholder { width: 24px; height: 32px; }
.analysis-heading-row .section-kicker { margin: 0 0 2px; }
.analysis-heading-row strong { color: #ffe28a; font: 800 13px ui-monospace, monospace; }
.analysis-result-list { display: grid; gap: 5px; margin-top: 9px; }
.analysis-result-list div { display: flex; justify-content: space-between; gap: 8px; padding: 6px 8px; border: 1px solid currentColor; border-radius: 7px; background: rgba(4, 15, 22, .3); font-size: 11px; }
.analysis-result-list span { color: var(--text-helper); }
.analysis-waiting, .analysis-battle-count { margin: 8px 0 0; color: var(--text-helper); font-size: 11px; }
.composite-status-card { padding: 13px !important; border: 1px solid #345165 !important; border-radius: 10px; background: linear-gradient(135deg, #142a39, #12222e); }
.status-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.status-heading span { color: #7ed9ec; font: 750 11px ui-monospace, monospace; letter-spacing: .15em; }
.status-heading strong { font-size: 14px; }
.success { color: #74e7aa; } .failure { color: #ff7784; }
.preview-progress { height: 5px; margin-top: 10px; overflow: hidden; border-radius: 99px; background: #2b4453; }
.preview-progress span { display: block; width: 100%; height: 100%; background: linear-gradient(90deg, #50cde8, #f5c568); transform-origin: left; animation: preview-progress var(--preview-duration) linear forwards; }
.status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0 0; }
.status-grid div { padding: 8px; border-radius: 7px; background: rgba(4, 15, 22, .34); }
.status-grid dt { color: var(--text-helper); font-size: 11px; } .status-grid dd { margin: 3px 0 0; color: #e9faff; font: 700 13px ui-monospace, monospace; }
.control-grid, .composite-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 10px; }
.control-grid button, .composite-actions button { padding: 10px; } .wide { grid-column: 1 / -1; }
.score-line { display: flex; grid-column: 1 / -1; justify-content: space-between; color: var(--text-helper); font: 12px ui-monospace, monospace; }
@keyframes preview-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@media (max-width: 860px) { .composite-page { display: block; height: auto; min-height: calc(100dvh - 72px); padding: 18px 0 32px; overflow: visible; } .composite-layout { grid-template-columns: 1fr; } .composite-heading { align-items: start; } .composite-arena-panel { height: auto; container-type: normal; } .composite-control-panel { height: auto; overflow: visible; } }
@media (max-width: 520px) { .composite-page { width: calc(100% - 20px); padding-top: 14px; } .composite-heading .version-chip { display: none; } .mechanic-nav { overflow-x: auto; } .mechanic-nav a { flex: 0 0 auto; } .composite-arena-panel { padding: 7px; } }
</style>
