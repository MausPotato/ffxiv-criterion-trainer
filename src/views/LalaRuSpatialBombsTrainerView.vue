<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import LalaRuSpatialBombsArena from '../components/lalaru/LalaRuSpatialBombsArena.vue';
import DeathDialog from '../components/trainer/DeathDialog.vue';
import TrainerActionRow from '../components/trainer/TrainerActionRow.vue';
import TrainerPageShell from '../components/trainer/TrainerPageShell.vue';
import TrainerPartyAssignment from '../components/trainer/TrainerPartyAssignment.vue';
import TrainerStageCard from '../components/trainer/TrainerStageCard.vue';
import TrainerStats from '../components/trainer/TrainerStats.vue';
import { useLalaRuSpatialBombsTrainer } from '../composables/useLalaRuSpatialBombsTrainer.ts';
import { SPATIAL_BOMBS_TIMING, type SpatialPartyId } from '../mechanics/lalaru/index.ts';
import { MECHANIC_ICONS } from '../assets/mechanic-icons.ts';
import { trainerNavigationFor } from '../navigation/trainer-navigation.ts';

const trainer = useLalaRuSpatialBombsTrainer();
const lalaruNavigation = trainerNavigationFor('lalaru');
const deathDialogOpen = ref(false);
const actorLabels: Readonly<Record<SpatialPartyId, string>> = {
  you: 'YOU', 'npc-a': '隊友 A', 'npc-b': '隊友 B', 'npc-c': '隊友 C'
};
const subtractionIcons = {
  1: MECHANIC_ICONS.spatialSubtractionOne,
  2: MECHANIC_ICONS.spatialSubtractionTwo,
  3: MECHANIC_ICONS.spatialSubtractionThree,
  4: MECHANIC_ICONS.spatialSubtractionFour
} as const;
const questionRevealed = computed(() => trainer.phase.value !== 'idle' && trainer.phase.value !== 'lead-in');
const stageBadge = computed(() => trainer.phase.value === 'idle' ? '準備階段' : trainer.phase.value === 'resolved' || trainer.phase.value === 'dead' ? '結算階段' : '演出階段');
const stageClock = computed(() => {
  if (trainer.phase.value === 'idle') return 'WAITING';
  if (trainer.phase.value === 'lead-in') return 'HIDDEN';
  if (trainer.phase.value === 'preview') return 'READY';
  if (trainer.phase.value === 'cannon-countdown') return `${trainer.cannonSeconds.value}s`;
  if (trainer.phase.value === 'resolved') return 'COMPLETE';
  if (trainer.phase.value === 'dead') return 'FAILED';
  return `STEP ${trainer.currentStep.value}`;
});
const stageTitle = computed(() => ({
  idle: '觀察配置並調整初始位置',
  'lead-in': '題目準備中',
  preview: '立體魔法陣準備中',
  stepping: `魔紋步進 ${trainer.currentStep.value} / 9`,
  'cannon-countdown': '旋轉角＋魔紋炮',
  'cannon-impact': '魔紋炮發動',
  dead: '演練失敗',
  resolved: '演練成功'
}[trainer.phase.value]));
const stageDescription = computed(() => {
  if (trainer.phase.value === 'idle') return '按下開始後先進入空場前導，再揭示本題配置與 Debuff。';
  if (trainer.phase.value === 'lead-in') return `${SPATIAL_BOMBS_TIMING.revealDelayMs / 1000} 秒後顯示箭頭、白球與立體炸彈。`;
  if (trainer.phase.value === 'preview') return `${SPATIAL_BOMBS_TIMING.previewDurationMs / 1000} 秒後開始逐格前進。`;
  if (trainer.phase.value === 'stepping') return '每個白球與炸彈都是獨立傷害；紅色步進格碰觸即死。';
  if (trainer.phase.value === 'cannon-countdown') return '依旋轉角提示移入最後安全扇形，位置不會重置。';
  if (trainer.phase.value === 'dead') return trainer.deathRecord.value?.reason ?? '受到致死傷害。';
  return '所有減算層數已清除，且成功避開魔紋炮。';
});
const deathReason = computed(() => {
  const death = trainer.deathRecord.value;
  if (!death) return '';
  return `${death.reason}｜剩餘 ${death.remainingLayers} 層｜位置 (${death.position.x.toFixed(2)}, ${death.position.y.toFixed(2)})｜${Math.round(death.elapsedMs)}ms`;
});
const preventContextMenu = (event: MouseEvent): void => event.preventDefault();
watch(() => trainer.deathRecord.value, death => { deathDialogOpen.value = death !== null; });
function retry(): void {
  deathDialogOpen.value = false;
  trainer.retry();
}
function nextQuestion(): void {
  deathDialogOpen.value = false;
  trainer.nextQuestion();
}
onMounted(() => document.addEventListener('contextmenu', preventContextMenu));
onBeforeUnmount(() => document.removeEventListener('contextmenu', preventContextMenu));
</script>

<template>
  <TrainerPageShell
    title="拉拉魯｜立體炸彈戰術"
    description="在雙路線逐格推進時持續移動，逐次消除減算炸彈，最後處理旋轉角魔紋炮。"
    version="FOURTH MECHANIC · LIVE MOVEMENT"
    :navigation="lalaruNavigation"
    navigation-label="拉拉魯機制選擇"
    arena-label="拉拉魯立體炸彈練習場地"
  >
    <template #arena>
      <LalaRuSpatialBombsArena
          :phase="trainer.phase.value"
          :pattern="trainer.pattern.value"
          :player-position="trainer.playerPosition.value"
          :player-facing-angle="trainer.playerFacingAngle.value"
          :actor-positions="trainer.actorPositions.value"
          :remaining-layers="trainer.remainingLayers.value"
          :dead-actor-ids="trainer.deadActorIds.value"
          :active-cells="trainer.activeCells.value"
          :dangerous-cells="trainer.dangerousCells.value"
          :exploding-source-ids="trainer.explodingSourceIds.value"
          :removed-source-ids="trainer.removedSourceIds.value"
          :cannon-question="trainer.question.value.cannon"
          :cannon-safe-direction="trainer.cannonSolution.value.finalSafeDirection"
          :cannon-seconds="trainer.cannonSeconds.value"
          :cannon-impact-key="trainer.cannonImpactKey.value"
          :camera-reset-key="trainer.cameraResetKey.value"
          :death-record="trainer.deathRecord.value"
          :succeeded="trainer.succeeded.value"
          @start="trainer.start"
          @update-player-position="trainer.setPlayerPosition"
          @update-player-facing-angle="trainer.setPlayerFacingAngle"
      />
    </template>

    <template #assignment>
      <TrainerPartyAssignment
        title="減算炸彈 β"
        summary="操作角色：YOU"
        note="開始後顯示全隊 Debuff；隊友將依各自層數移動"
      >
            <article
              v-for="member in trainer.question.value.party"
              :key="member.id"
              class="role-card assignment-card"
              :class="{ selected: member.id === 'you', dead: trainer.deadActorIds.value.includes(member.id) }"
            >
              <strong>{{ actorLabels[member.id] }}</strong>
              <template v-if="questionRevealed">
                <img
                  v-if="trainer.remainingLayers.value[member.id] > 0"
                  class="spatial-layer-icon"
                  :src="subtractionIcons[trainer.remainingLayers.value[member.id] as 1 | 2 | 3 | 4]"
                  :alt="`減算炸彈 β ${trainer.remainingLayers.value[member.id]} 層`"
                />
                <b v-else class="cleared-layer">0</b>
                <span class="layer-caption">初始 {{ member.initialLayer }} 層</span>
              </template>
              <span v-else class="assignment-pending">等待提示</span>
            </article>
      </TrainerPartyAssignment>
    </template>

    <template #status>
      <TrainerStats
            :round="trainer.attempts.value"
            :wins="trainer.successes.value"
            round-label="嘗試"
            wins-label="成功"
            :show-streak="false"
      />
      <TrainerStageCard :badge="stageBadge" :clock="stageClock" :title="stageTitle" :status="stageDescription">
            <div v-if="trainer.phase.value === 'lead-in'" class="stage-progress is-timed" :style="{ '--stage-duration': `${SPATIAL_BOMBS_TIMING.revealDelayMs}ms` }"><span></span></div>
            <div v-else-if="trainer.phase.value === 'preview'" class="stage-progress is-timed" :style="{ '--stage-duration': `${SPATIAL_BOMBS_TIMING.previewDurationMs}ms` }"><span></span></div>
            <dl class="trainer-info-grid">
              <div><dt>步進</dt><dd>{{ trainer.currentStep.value }} / 9</dd></div>
              <div><dt>即死格</dt><dd>{{ trainer.dangerousCells.value.length }}</dd></div>
              <div><dt>本人層數</dt><dd>{{ questionRevealed ? trainer.remainingLayers.value.you : '—' }}</dd></div>
              <div><dt>承傷事件</dt><dd>{{ trainer.damageRecords.value.filter(record => record.actorId === 'you').length }}</dd></div>
            </dl>
      </TrainerStageCard>
    </template>

    <template #actions>
      <TrainerActionRow class="two-column">
            <button v-if="trainer.phase.value === 'idle'" class="primary-button wide" type="button" @click="trainer.start">開始演練</button>
            <button v-if="trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'" class="secondary-button" type="button" @click="retry">重試本題</button>
            <button v-if="trainer.phase.value === 'dead' || trainer.phase.value === 'resolved'" class="primary-button" type="button" @click="nextQuestion">下一題</button>
      </TrainerActionRow>
    </template>

    <template #dialogs>
      <DeathDialog
      :open="deathDialogOpen"
      :reason="deathReason"
      @close="deathDialogOpen = false"
      @retry="retry"
      @next="nextQuestion"
      />
    </template>
  </TrainerPageShell>
</template>

<style scoped>
.assignment-card { cursor: default; }
.assignment-card.dead { border-color: #d85668; background: #3e1d27; }
.assignment-card > strong { color: #effcff; font-size: var(--type-role); }
.assignment-pending, .layer-caption { color: var(--text-helper); font-size: var(--type-body); }
.spatial-layer-icon { width: 34px; height: 34px; object-fit: contain; filter: drop-shadow(0 2px 3px rgba(0,0,0,.6)); }
.assignment-card .cleared-layer { display: grid; width: 27px; height: 27px; place-items: center; border: 1px solid #69daa5; border-radius: 5px; color: #86ffc0; background: #0b3028; font: 900 13px ui-monospace, monospace; }
</style>
