<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import LalaRuCompositeArena from '../components/lalaru/LalaRuCompositeArena.vue';
import DeathDialog from '../components/trainer/DeathDialog.vue';
import TrainerActionRow from '../components/trainer/TrainerActionRow.vue';
import TrainerPracticeSettings from '../components/trainer/TrainerPracticeSettings.vue';
import TrainerSegmentedControl from '../components/trainer/TrainerSegmentedControl.vue';
import TrainerStageCard from '../components/trainer/TrainerStageCard.vue';
import TrainerStats from '../components/trainer/TrainerStats.vue';
import { useLalaRuCompositeTrainer } from '../composables/useLalaRuCompositeTrainer.ts';
import {
  COMPOSITE_ROUTE_LENGTH,
  COMPOSITE_TIMING,
  type AnalysisDebuff
} from '../mechanics/lalaru/index.ts';
import { MECHANIC_ICONS, type MechanicIconName } from '../assets/mechanic-icons.ts';

const trainer = useLalaRuCompositeTrainer();
const deathDialogOpen = ref(false);
const modeOptions = [
  { value: 'tutorial', label: '教學模式' },
  { value: 'battle', label: '實戰模式' }
] as const;
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
const stageBadge = computed(() => trainer.phase.value === 'idle' ? '準備階段' : trainer.phase.value === 'resolved' || trainer.phase.value === 'dead' ? '結算階段' : '進行階段');
const stageClock = computed(() => trainer.paused.value ? 'Ⅱ PAUSED' : trainer.phase.value === 'idle' ? 'Ⅱ WAITING' : trainer.phase.value === 'resolved' ? '✓ COMPLETE' : trainer.phase.value === 'dead' ? '× FAILED' : '▶ LIVE');
const stageTitle = computed(() => {
  if (trainer.paused.value) return '已暫停';
  if (trainer.phase.value === 'analysis-lead') return '分析賦予・T0 前';
  if (trainer.phase.value === 'preview') return `預覽 ${COMPOSITE_TIMING.previewDurationMs / 1000} 秒`;
  if (trainer.phase.value === 'stepping') return `步進 ${trainer.routeCellNumber.value} / ${COMPOSITE_ROUTE_LENGTH}`;
  if (trainer.phase.value === 'player-rotation') return '玩家旋轉角乘算';
  if (trainer.phase.value === 'high-precision') return '高精度光彈準備';
  if (trainer.phase.value === 'dead') return '機制失敗';
  if (trainer.phase.value === 'resolved') return resolvedSummary.value;
  return '準備中';
});
const stageDescription = computed(() => trainer.phase.value === 'idle'
  ? '開始後依序處理步進地板、光球分析與魔紋砲。'
  : trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'
    ? '本題已依最後位置與面向完成判定。'
    : '依左側場地提示移動；教學模式可使用下方動畫控制。');
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
  <main class="trainer-page composite-page">
    <div class="trainer-heading composite-heading">
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

    <div class="trainer-layout composite-layout">
      <section class="arena-panel panel composite-arena-panel">
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

      <aside class="control-panel panel trainer-control-stack composite-control-panel">
        <TrainerPracticeSettings title-id="composite-settings-title" kicker="TRAINING MODE">
          <TrainerSegmentedControl
            :model-value="trainer.mode.value"
            :options="modeOptions"
            label="練習模式"
            @change="value => trainer.setMode(value as 'tutorial' | 'battle')"
          />
          <p class="mode-description">{{ trainer.mode.value === 'tutorial' ? '顯示完整路線、危險地板及光球分析角度。' : '只顯示實際箭頭、光球、C 字環與 AoE 演出。' }}</p>
        </TrainerPracticeSettings>

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

        <section class="hud-section composite-hud" aria-live="polite">
          <TrainerStats
            :round="trainer.attempts.value"
            :wins="trainer.successes.value"
            round-label="完成"
            wins-label="成功"
            :show-streak="false"
          />
          <TrainerStageCard :badge="stageBadge" :clock="stageClock" :title="stageTitle" :status="stageDescription">
            <div
              v-if="trainer.phase.value === 'preview' && !trainer.paused.value"
              class="stage-progress is-timed"
              :style="{ '--stage-duration': `${COMPOSITE_TIMING.previewDurationMs}ms` }"
            ><span></span></div>
          <dl class="trainer-info-grid status-grid">
            <div><dt>危險格</dt><dd>{{ trainer.dangerousCells.value.length }} / 20</dd></div>
            <div><dt>光球爆炸</dt><dd>{{ trainer.explosionCount.value }} / 2</dd></div>
            <div><dt>魔紋砲</dt><dd>{{ trainer.bossCannonState.value === 'hidden' ? '—' : trainer.bossCannonState.value === 'waiting' ? '光球爆炸中' : trainer.bossCannonState.value === 'resolved' ? (trainer.bossCannonSucceeded.value ? '通過' : '命中') : trainer.bossCannonState.value === 'resolving' ? '結算' : '預兆' }}</dd></div>
            <div><dt>缺口偏移</dt><dd>{{ trainer.playerRotationState.value === 'applied' ? `${trainer.playerGapRotationDegrees.value > 0 ? '+' : ''}${trainer.playerGapRotationDegrees.value}°` : '尚未乘算' }}</dd></div>
            <div><dt>下次步進</dt><dd>{{ trainer.paused.value || !trainer.nextStepInMs.value ? '—' : `${trainer.nextStepInMs.value / 1000}s` }}</dd></div>
          </dl>
          </TrainerStageCard>
        </section>

        <section v-if="trainer.mode.value === 'tutorial'">
          <p class="section-kicker">TIMELINE CONTROL</p>
          <h2>動畫檢查</h2>
          <TrainerActionRow class="two-column animation-controls">
            <button class="secondary-button" type="button" :disabled="trainer.phase.value === 'idle' || trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'" @click="trainer.togglePause">{{ trainer.paused.value ? '繼續' : '暫停' }}</button>
            <button class="secondary-button" type="button" :disabled="trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'" @click="trainer.stepForward">逐步播放</button>
            <button class="secondary-button wide" type="button" @click="trainer.replay">從頭重播</button>
          </TrainerActionRow>
        </section>

        <section>
          <TrainerActionRow class="two-column composite-actions">
          <button v-if="trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'" class="secondary-button" type="button" @click="trainer.retry">重試同一題</button>
          <button v-if="trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'" class="primary-button" type="button" @click="trainer.nextQuestion">下一題</button>
          <button v-if="trainer.phase.value === 'idle'" class="primary-button wide" type="button" @click="trainer.start">開始</button>
          </TrainerActionRow>
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
.composite-page { user-select: none; -webkit-user-select: none; }
.composite-control-panel h2 { margin: 0; font-size: 19px; }
.mode-description { margin: 8px 0 0; color: var(--text-helper); font-size: var(--type-secondary); line-height: var(--leading-body); }
.analysis-heading-row { display: grid; grid-template-columns: 32px 1fr auto; gap: 9px; align-items: center; }
.analysis-heading-row img { width: 24px; height: 32px; }
.analysis-icon-placeholder { width: 24px; height: 32px; }
.analysis-heading-row .section-kicker { margin: 0 0 2px; }
.analysis-heading-row strong { color: #ffe28a; font: 800 13px ui-monospace, monospace; }
.analysis-result-list { display: grid; gap: 5px; margin-top: 9px; }
.analysis-result-list div { display: flex; justify-content: space-between; gap: 8px; padding: 6px 8px; border: 1px solid currentColor; border-radius: 7px; background: rgba(4, 15, 22, .3); font-size: 11px; }
.analysis-result-list span { color: var(--text-helper); }
.analysis-waiting, .analysis-battle-count { margin: 8px 0 0; color: var(--text-helper); font-size: 11px; }
.success { color: #74e7aa; } .failure { color: #ff7784; }
.composite-hud { margin-top: 0; }
.status-grid { margin-top: 8px; }
.animation-controls, .composite-actions { margin-top: 8px; }
@media (max-width: 520px) { .mechanic-nav { overflow-x: auto; } .mechanic-nav a { flex: 0 0 auto; } }
</style>
