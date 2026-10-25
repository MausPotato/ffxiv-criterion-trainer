<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import LalaRuArena from '../components/lalaru/LalaRuArena.vue';
import LalaRuCheatSheet from '../components/lalaru/LalaRuCheatSheet.vue';
import TrainerActionRow from '../components/trainer/TrainerActionRow.vue';
import TrainerPracticeSettings from '../components/trainer/TrainerPracticeSettings.vue';
import TrainerSegmentedControl from '../components/trainer/TrainerSegmentedControl.vue';
import TrainerStageCard from '../components/trainer/TrainerStageCard.vue';
import TrainerStats from '../components/trainer/TrainerStats.vue';
import { useLalaRuTrainer } from '../composables/useLalaRuTrainer.ts';
import { LALARU_TIMING } from '../mechanics/lalaru/timing.ts';
import type { ArrowSide, CardinalDirection, SelectedSide } from '../mechanics/lalaru/types.ts';

const trainer = useLalaRuTrainer();
const showCheatSheet = ref(true);
const modeOptions = [
  { value: 'tutorial', label: '教學模式' },
  { value: 'battle', label: '實戰模式' }
] as const;

const stageBadge = computed(() => trainer.phase.value === 'resolved' ? '結算階段' : trainer.phase.value === 'casting' ? '作答階段' : '準備階段');
const stageClock = computed(() => trainer.phase.value === 'casting' ? '▶ CASTING' : trainer.phase.value === 'resolved' ? '✓ COMPLETE' : 'Ⅱ WAITING');
const stageTitle = computed(() => trainer.phase.value === 'casting' ? '判定倒數中' : trainer.phase.value === 'resolved' ? (trainer.succeeded.value ? '走位成功' : '受到攻擊') : '準備中');
const stageDescription = computed(() => trainer.phase.value === 'casting'
  ? '拖曳 YOU 移動。技能只會在最後一次結算。'
  : trainer.phase.value === 'resolved'
    ? '本題已依結算瞬間的位置完成判定。'
    : '初始安全區會隨題目改變；角色可在場內自由拖曳。');

const cardinalLabels: Readonly<Record<CardinalDirection, string>> = {
  north: '北', east: '東', south: '南', west: '西'
};
const arrowSideLabels: Readonly<Record<ArrowSide, string>> = { left: '左', right: '右' };
const selectedSideLabels: Readonly<Record<SelectedSide, string>> = { left: '左', right: '右' };

function preventContextMenu(event: MouseEvent): void {
  event.preventDefault();
}

onMounted(() => document.addEventListener('contextmenu', preventContextMenu));
onBeforeUnmount(() => document.removeEventListener('contextmenu', preventContextMenu));
</script>

<template>
  <main class="trainer-page lalaru-page">
    <div class="trainer-heading lalaru-heading">
      <div>
        <RouterLink class="back-link" to="/">← 回到迷宮一覽</RouterLink>
        <h1>拉拉魯｜旋轉角乘算</h1>
        <p>觀察頭頂旋轉提示與乘算 Icon，走進最終 90° 安全區。</p>
      </div>
      <span class="version-chip">FIRST MECHANIC · PREVIEW</span>
    </div>

    <nav class="mechanic-nav" aria-label="拉拉魯機制選擇">
      <RouterLink class="active" to="/aloalo-island/lalaru/rotation">旋轉角乘算</RouterLink>
      <RouterLink to="/aloalo-island/lalaru/composite-pattern">複合魔紋</RouterLink>
    </nav>

    <div class="trainer-layout lalaru-layout">
      <section class="arena-panel panel lalaru-arena-panel">
        <LalaRuArena
          :phase="trainer.phase.value"
          :mode="trainer.mode.value"
          :player-position="trainer.playerPosition.value"
          :player-facing-angle="trainer.playerFacingAngle.value"
          :arrow-side="trainer.question.value.arrowSide"
          :multiplier="trainer.question.value.multiplier"
          :dot-count="trainer.dotCount.value"
          :animation-key="trainer.animationKey.value"
          :initial-safe-direction="trainer.question.value.initialSafeDirection"
          :final-safe-direction="trainer.solution.value.finalSafeDirection"
          :succeeded="trainer.succeeded.value"
          @start="trainer.start"
          @update-player-position="trainer.setPlayerPosition"
          @update-player-facing-angle="trainer.setPlayerFacingAngle"
        />
      </section>

      <aside class="control-panel panel trainer-control-stack lalaru-control-panel">
        <TrainerPracticeSettings title-id="rotation-settings-title" kicker="TRAINING MODE">
          <TrainerSegmentedControl
            :model-value="trainer.mode.value"
            :options="modeOptions"
            label="練習模式"
            :disabled="trainer.phase.value === 'casting'"
            @change="value => trainer.setMode(value as 'tutorial' | 'battle')"
          />
          <p class="mode-description">
            {{ trainer.mode.value === 'tutorial'
              ? '結算後顯示完整推導；結算前不會標出答案。'
              : '只保留實戰可觀察資訊；結算前不顯示方向答案。' }}
          </p>
          <button
            class="secondary-button cheat-sheet-toggle"
            type="button"
            aria-controls="lalaru-cheat-sheet"
            :aria-expanded="showCheatSheet"
            @click="showCheatSheet = !showCheatSheet"
          >{{ showCheatSheet ? '隱藏乘算小抄' : '顯示乘算小抄' }}</button>
        </TrainerPracticeSettings>

        <LalaRuCheatSheet id="lalaru-cheat-sheet" v-show="showCheatSheet" />

        <section class="hud-section lalaru-hud" aria-live="polite">
          <TrainerStats
            :round="trainer.attempts.value"
            :wins="trainer.successes.value"
            round-label="完成"
            wins-label="成功"
            :show-streak="false"
          />
          <TrainerStageCard
            :badge="stageBadge"
            :clock="stageClock"
            :title="stageTitle"
            :status="stageDescription"
          >
          <div
            v-if="trainer.phase.value === 'casting' && trainer.mode.value === 'tutorial'"
            class="stage-progress is-timed"
            aria-hidden="true"
            :style="{ '--stage-duration': `${LALARU_TIMING.resolveMs}ms` }"
          >
            <span :key="trainer.animationKey.value"></span>
          </div>
          </TrainerStageCard>

          <TrainerActionRow class="two-column">
            <button
              v-if="trainer.phase.value === 'resolved'"
              class="secondary-button"
              type="button"
              @click="trainer.retry"
            >重新本題</button>
            <button
              v-if="trainer.phase.value === 'resolved'"
              class="primary-button"
              type="button"
              @click="trainer.nextQuestion"
            >下一題</button>
            <button
              v-if="trainer.phase.value === 'idle'"
              class="primary-button wide"
              type="button"
              @click="trainer.start"
            >開始</button>
          </TrainerActionRow>
        </section>

        <section
          v-if="trainer.phase.value === 'resolved' && trainer.mode.value === 'tutorial'"
          class="tutorial-breakdown"
        >
          <p class="section-kicker">ANSWER REVIEW</p>
          <h2>本題解法</h2>
          <p class="solution-chain">
            初始安全區：<strong class="initial-answer">{{ cardinalLabels[trainer.question.value.initialSafeDirection] }}</strong>
            <span>→</span>
            箭頭側：<strong>{{ arrowSideLabels[trainer.question.value.arrowSide] }}</strong>
            <span>→</span>
            <strong>{{ trainer.question.value.multiplier }}</strong>：{{ trainer.question.value.multiplier === 'III' ? '相反' : '相同' }}
            <span>→</span>
            選擇側：<strong>{{ selectedSideLabels[trainer.solution.value.selectedSide] }}</strong>
            <span>→</span>
            最終安全區：<strong class="final-answer">{{ cardinalLabels[trainer.solution.value.finalSafeDirection] }}</strong>
          </p>
          <div class="sector-legend">
            <span><i class="initial"></i>初始安全扇形</span>
            <span><i class="final"></i>最終安全扇形</span>
          </div>
        </section>

      </aside>
    </div>
  </main>
</template>

<style scoped>
.lalaru-page { user-select: none; -webkit-user-select: none; }
.lalaru-control-panel h2 { margin: 0; font-size: 19px; }
.mode-description { margin: 8px 0 0; color: var(--text-helper); font-size: var(--type-secondary); line-height: var(--leading-body); }
.cheat-sheet-toggle { width: 100%; margin-top: 8px; padding: 7px 10px; font-size: var(--type-body); }
.lalaru-hud { margin-top: 0; }
.success { color: #74e7aa; }
.failure { color: #ff7784; }
.solution-chain { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin: 10px 0; color: #bdcdd5; font-size: 14px; line-height: 1.8; }
.solution-chain strong { color: #fff; }
.solution-chain .initial-answer { color: #75d8ff; }
.solution-chain .final-answer { color: #72e9ad; }
.sector-legend { display: flex; flex-wrap: wrap; gap: 13px; color: var(--text-helper); font-size: 12px; }
.sector-legend span { display: inline-flex; align-items: center; gap: 6px; }
.sector-legend i { width: 12px; height: 12px; border-radius: 3px; }
.sector-legend i.initial { border: 1px solid #6ed7ff; background: rgba(79, 176, 226, .4); }
.sector-legend i.final { border: 1px solid #70ecad; background: rgba(76, 220, 143, .4); }
@media (max-width: 860px) {
  .lalaru-page { min-height: calc(100dvh - 72px); }
}
@media (max-width: 520px) {
  .mechanic-nav { overflow-x: auto; }
  .mechanic-nav a { flex: 0 0 auto; }
}
</style>
