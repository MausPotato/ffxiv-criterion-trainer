<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import LalaRuAnalysisArena from '../components/lalaru/LalaRuAnalysisArena.vue';
import TrainerActionRow from '../components/trainer/TrainerActionRow.vue';
import TrainerPageShell from '../components/trainer/TrainerPageShell.vue';
import TrainerPracticeSettings from '../components/trainer/TrainerPracticeSettings.vue';
import TrainerStageCard from '../components/trainer/TrainerStageCard.vue';
import TrainerStats from '../components/trainer/TrainerStats.vue';
import { useLalaRuAnalysisTrainer } from '../composables/useLalaRuAnalysisTrainer.ts';
import { ANALYSIS_GAP_HALF_ANGLE_DEGREES, ANALYSIS_TIMING, type AnalysisDebuff } from '../mechanics/lalaru/index.ts';
import { trainerNavigationFor } from '../navigation/trainer-navigation.ts';

const trainer = useLalaRuAnalysisTrainer();
const lalaruNavigation = trainerNavigationFor('lalaru');
const debuffLabels: Readonly<Record<AnalysisDebuff, string>> = {
  front: '正面未解析', back: '背面未解析', left: '左側未解析', right: '右側未解析'
};
const stageBadge = computed(() => trainer.phase.value === 'idle' ? '準備階段' : trainer.phase.value === 'resolved' ? '結算階段' : '作答階段');
const stageClock = computed(() => trainer.phase.value === 'active' ? `${ANALYSIS_TIMING.resolveMs / 1000}s` : trainer.phase.value === 'resolved' ? '✓ COMPLETE' : 'Ⅱ WAITING');
const stageTitle = computed(() => trainer.phase.value === 'active' ? '分析判定中' : trainer.phase.value === 'resolved' ? (trainer.result.value ? '缺口接到攻擊' : '方向不符') : '準備中');
const stageDescription = computed(() => trainer.phase.value === 'active'
  ? '在倒數結束前調整角色位置與面向。'
  : trainer.phase.value === 'resolved'
    ? '本題已依引爆瞬間的缺口方向完成判定。'
    : '開始後光球會在固定時間引爆。');
const preventContextMenu = (event: MouseEvent): void => event.preventDefault();
onMounted(() => document.addEventListener('contextmenu', preventContextMenu));
onBeforeUnmount(() => document.removeEventListener('contextmenu', preventContextMenu));
</script>

<template>
  <TrainerPageShell
    title="拉拉魯｜分析方向"
    description="調整位置與角色面向，讓光球攻擊進入金色 C 字環的缺口。"
    version="ANALYSIS · FOUNDATION"
    :navigation="lalaruNavigation"
    navigation-label="拉拉魯機制選擇"
    arena-label="拉拉魯分析方向練習場地"
  >
    <template #arena>
      <LalaRuAnalysisArena
        :phase="trainer.phase.value"
        :player-position="trainer.playerPosition.value"
        :player-facing-angle="trainer.playerFacingAngle.value"
        :orb-position="trainer.question.value.orbPosition"
        :debuff="trainer.question.value.debuff"
        :result="trainer.result.value"
        :explosion-key="trainer.explosionKey.value"
        @start="trainer.start"
        @update-player-position="trainer.setPlayerPosition"
        @update-player-facing-angle="trainer.setPlayerFacingAngle"
      />
    </template>

    <template #settings>
      <TrainerPracticeSettings
        title-id="analysis-debuff-title"
        kicker="ANALYSIS DEBUFF"
        :title="debuffLabels[trainer.question.value.debuff]"
      >
        <p class="mode-description">缺口中心為角色的{{ trainer.question.value.debuff === 'front' ? '正面' : trainer.question.value.debuff === 'back' ? '背面' : trainer.question.value.debuff === 'left' ? '左側' : '右側' }}，暫定容許角度 ±{{ ANALYSIS_GAP_HALF_ANGLE_DEGREES }}°。</p>
        <div class="debuff-grid" aria-label="四種分析方向">
          <span v-for="debuff in (['front', 'back', 'left', 'right'] as AnalysisDebuff[])" :key="debuff" :class="{ active: trainer.question.value.debuff === debuff }">{{ debuffLabels[debuff] }}</span>
        </div>
      </TrainerPracticeSettings>
    </template>

    <template #context>
      <section>
        <p class="section-kicker">CONTROLS</p>
        <h2>操作</h2>
        <ul class="control-help">
          <li><strong>WASD／方向鍵</strong><span>依畫面方向持續移動</span></li>
          <li><strong>Q／E</strong><span>原地逆時針／順時針轉向</span></li>
          <li><strong>左鍵拖曳</strong><span>移動角色並更新面向</span></li>
          <li><strong>右鍵拖曳</strong><span>旋轉鏡頭，不改變世界面向</span></li>
        </ul>
      </section>
    </template>

    <template #status>
      <TrainerStats
        :round="trainer.attempts.value"
        :wins="trainer.successes.value"
        round-label="完成"
        wins-label="成功"
        :show-streak="false"
      />
      <TrainerStageCard :badge="stageBadge" :clock="stageClock" :title="stageTitle" :status="stageDescription">
        <dl class="trainer-info-grid three-column">
          <div><dt>世界面向</dt><dd>{{ Math.round(trainer.playerFacingAngle.value) }}°</dd></div>
          <div><dt>缺口中心</dt><dd>{{ Math.round(trainer.gapCenterAngle.value) }}°</dd></div>
          <div><dt>光球來源</dt><dd>{{ trainer.sourceAngle.value === null ? '重疊' : `${Math.round(trainer.sourceAngle.value)}°` }}</dd></div>
        </dl>
      </TrainerStageCard>
    </template>

    <template #actions>
      <TrainerActionRow class="two-column">
        <button v-if="trainer.phase.value === 'active'" class="secondary-button wide" type="button" @click="trainer.resolve">立即引爆檢查</button>
        <button v-if="trainer.phase.value === 'resolved'" class="secondary-button" type="button" @click="trainer.retry">同題重試</button>
        <button v-if="trainer.phase.value === 'resolved'" class="primary-button" type="button" @click="trainer.nextQuestion">隨機下一題</button>
        <button v-if="trainer.phase.value === 'idle'" class="primary-button wide" type="button" @click="trainer.start">開始</button>
      </TrainerActionRow>
    </template>
  </TrainerPageShell>
</template>

<style scoped>
.mode-description { margin: 8px 0 0; color: var(--text-helper); font-size: var(--type-secondary); line-height: var(--leading-body); }
.debuff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 10px; }
.debuff-grid span { padding: 8px; border: 1px solid var(--line-soft); border-radius: 7px; color: var(--text-helper); background: #101c27; text-align: center; font-size: 12px; }
.debuff-grid span.active { border-color: #d9b458; color: #ffe7a0; background: #3c321c; }
.control-help { display: grid; gap: 7px; margin: 10px 0 0; padding: 0; list-style: none; }
.control-help li { display: flex; justify-content: space-between; gap: 12px; padding: 8px; border-radius: 7px; background: rgba(6, 17, 24, .34); font-size: 12px; }
.control-help span { color: var(--text-helper); text-align: right; }
</style>
