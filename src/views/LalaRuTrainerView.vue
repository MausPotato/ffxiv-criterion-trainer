<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import LalaRuArena from '../components/lalaru/LalaRuArena.vue';
import LalaRuCheatSheet from '../components/lalaru/LalaRuCheatSheet.vue';
import TrainerActionRow from '../components/trainer/TrainerActionRow.vue';
import TrainerPageShell from '../components/trainer/TrainerPageShell.vue';
import TrainerPracticeSettings from '../components/trainer/TrainerPracticeSettings.vue';
import TrainerSegmentedControl from '../components/trainer/TrainerSegmentedControl.vue';
import TrainerStageCard from '../components/trainer/TrainerStageCard.vue';
import TrainerStats from '../components/trainer/TrainerStats.vue';
import { useLalaRuTrainer } from '../composables/useLalaRuTrainer.ts';
import { LALARU_TIMING } from '../mechanics/lalaru/timing.ts';
import type { ArrowSide, CardinalDirection, SelectedSide } from '../mechanics/lalaru/types.ts';
import { trainerNavigationFor } from '../navigation/trainer-navigation.ts';

const trainer = useLalaRuTrainer();
const lalaruNavigation = trainerNavigationFor('lalaru');
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
  <TrainerPageShell
    title="拉拉魯｜旋轉角乘算"
    description="根據王的乘算 Buff 與旋轉方向，找出最終 90° 安全區。"
    :navigation="lalaruNavigation"
    navigation-label="拉拉魯機制選擇"
    arena-label="拉拉魯旋轉角乘算練習場地"
  >
    <template #arena>
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
    </template>

    <template #settings>
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
      </TrainerPracticeSettings>
    </template>

    <template #context>
      <LalaRuCheatSheet default-view="boss" />
    </template>

    <template #status>
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
    </template>

    <template v-if="trainer.phase.value === 'resolved'" #actions>
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
      </TrainerActionRow>
    </template>

    <template v-if="trainer.phase.value === 'resolved' && trainer.mode.value === 'tutorial'" #review>
      <section class="tutorial-breakdown">
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
    </template>
  </TrainerPageShell>
</template>

<style scoped>
.mode-description { margin: 8px 0 0; color: var(--text-helper); font-size: var(--type-secondary); line-height: var(--leading-body); }
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
</style>
