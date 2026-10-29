<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import LalaRuPlanarMinesArena from '../components/lalaru/LalaRuPlanarMinesArena.vue';
import LalaRuCheatSheet from '../components/lalaru/LalaRuCheatSheet.vue';
import DeathDialog from '../components/trainer/DeathDialog.vue';
import TrainerActionRow from '../components/trainer/TrainerActionRow.vue';
import TrainerPageShell from '../components/trainer/TrainerPageShell.vue';
import TrainerPracticeSettings from '../components/trainer/TrainerPracticeSettings.vue';
import TrainerPartyAssignment from '../components/trainer/TrainerPartyAssignment.vue';
import TrainerStageCard from '../components/trainer/TrainerStageCard.vue';
import TrainerStats from '../components/trainer/TrainerStats.vue';
import { useLalaRuPlanarMinesTrainer } from '../composables/useLalaRuPlanarMinesTrainer.ts';
import { MECHANIC_ICONS } from '../assets/mechanic-icons.ts';
import { PLANAR_TIMELINE, type PlanarPartyId } from '../mechanics/lalaru/index.ts';
import { trainerNavigationFor } from '../navigation/trainer-navigation.ts';
import { trainerResultStatus } from '../presentation/trainer-result.ts';

const trainer = useLalaRuPlanarMinesTrainer();
const lalaruNavigation = trainerNavigationFor('lalaru');
const memberLabels: Readonly<Record<PlanarPartyId, string>> = {
  you: 'YOU', 'npc-a': '隊友 A', 'npc-b': '隊友 B', 'npc-c': '隊友 C'
};
const stageProgress = computed(() => {
  if (trainer.phase.value === 'idle') return 0;
  if (trainer.phase.value !== 'preparing') return 100;
  return Math.min(100, Math.max(0, ((PLANAR_TIMELINE.durationMs / 1000 - trainer.remainingSeconds.value) / (PLANAR_TIMELINE.durationMs / 1000)) * 100));
});
const stageBadge = computed(() => trainer.phase.value === 'idle' || trainer.phase.value === 'preparing' ? '準備階段' : '結算階段');
const stageClock = computed(() => {
  if (trainer.phase.value === 'idle') return '待開始';
  if (trainer.phase.value === 'preparing') return `${trainer.remainingSeconds.value}`;
  if (trainer.phase.value === 'resolved') return trainerResultStatus(true);
  if (trainer.phase.value === 'dead') return trainerResultStatus(false);
  return '▶ RESOLVING';
});
const stageTitle = computed(() => ({
  idle: '準備就緒',
  preparing: '作答中',
  'forced-movement': '強制移動',
  'stack-resolving': '雙數爆擊',
  resolved: '機制完成',
  dead: '機制失敗'
}[trainer.phase.value]));
const stageDescription = computed(() => ({
  idle: '在左側場地開始練習；開始後會取得本題 Debuff。',
  preparing: trainer.placementConfirmed.value ? '站位已確認，仍可在倒數內調整視角與面向。' : '請在倒數內完成視角、站位與面向調整。',
  'forced-movement': '角色正依最終面向強制移動並逐顆觸發地雷。',
  'stack-resolving': '正在依實際位置結算兩組雙數爆擊。',
  resolved: '地雷與雙數爆擊皆已完成判定。',
  dead: trainer.failureReason.value || '本題處理失敗。'
}[trainer.phase.value]));
const preventContextMenu = (event: MouseEvent): void => event.preventDefault();
onMounted(() => document.addEventListener('contextmenu', preventContextMenu));
onBeforeUnmount(() => document.removeEventListener('contextmenu', preventContextMenu));
</script>

<template>
  <TrainerPageShell
    title="拉拉魯｜平面爆雷戰術"
    description="依減算層數與分攤安排站位，反推旋轉前面向並沿正確方向踩雷。"
    :navigation="lalaruNavigation"
    navigation-label="拉拉魯機制選擇"
    arena-label="拉拉魯平面爆雷練習場地"
  >
    <template #arena>
      <LalaRuPlanarMinesArena
        :mine-cells="trainer.mineCells.value"
        :missing-cell="trainer.missingCell.value"
        :player-position="trainer.playerPosition.value"
        :player-facing-angle="trainer.playerFacingAngle.value"
        :player-assignment="trainer.playerAssignment.value"
        :npc-assignments="trainer.npcAssignments.value"
        :show-npcs="trainer.placementConfirmed.value"
        :can-operate="trainer.canOperate.value"
        :debuffs-visible="trainer.debuffsVisible.value"
        :mine-reveal-state="trainer.mineRevealState.value"
        :rotation-cue-visible="trainer.rotationCueVisible.value"
        :rotation-dot-count="trainer.rotationDotCount.value"
        :rotation-animation-key="trainer.rotationAnimationKey.value"
        :remaining-seconds="trainer.remainingSeconds.value"
        :actor-positions="trainer.actorPositions.value"
        :actor-facing-angles="trainer.actorFacingAngles.value"
        :remaining-layers="trainer.remainingLayers.value"
        :triggered-mine-keys="trainer.triggeredMineKeys.value"
        :exploding-mine-keys="trainer.explodingMineKeys.value"
        :stack-resolving-target-ids="trainer.stackResolvingTargetIds.value"
        :phase="trainer.phase.value"
        @start="trainer.start"
        @update-player-position="trainer.setPlayerPosition"
        @update-player-facing-angle="trainer.setPlayerFacingAngle"
      />
    </template>

    <template #settings>
      <TrainerPracticeSettings title-id="planar-settings-title">
        <div class="setting-row" role="group" aria-label="平面爆雷設定">
          <label class="switch-row">
            <input
              type="radio"
              name="planar-strategy"
              value="gap-bottom-left"
              :checked="trainer.strategy.value === 'gap-bottom-left'"
              :disabled="trainer.phase.value !== 'idle' && trainer.phase.value !== 'preparing'"
              @change="trainer.setStrategy('gap-bottom-left')"
            >
            <span><strong>缺口左下</strong><small>採用左下站位法</small></span>
          </label>
          <label class="switch-row">
            <input
              type="radio"
              name="planar-strategy"
              value="gap-bottom-right"
              :checked="trainer.strategy.value === 'gap-bottom-right'"
              :disabled="trainer.phase.value !== 'idle' && trainer.phase.value !== 'preparing'"
              @change="trainer.setStrategy('gap-bottom-right')"
            >
            <span><strong>缺口右下</strong><small>採用右下站位法</small></span>
          </label>
          <label class="switch-row">
            <input
              type="checkbox"
              :checked="trainer.showResolutionAnimation.value"
              @change="trainer.setShowResolutionAnimation(($event.target as HTMLInputElement).checked)"
            >
            <span><strong>觀看完整動畫</strong><small>關閉時直接結算</small></span>
          </label>
        </div>
      </TrainerPracticeSettings>
    </template>

    <template #assignment>
      <TrainerPartyAssignment
        :summary="trainer.debuffsVisible.value ? `層數合計 ${trainer.question.value.party.reduce((sum, member) => sum + member.layer, 0)}` : '操作角色：YOU'"
        note="開始後顯示全隊 Debuff；確認站位後才顯示隊友位置"
      >
        <article
          v-for="member in trainer.question.value.party"
          :key="member.id"
          class="role-card assignment-card"
          :class="{ selected: member.id === 'you' }"
        >
          <strong>{{ memberLabels[member.id] }}</strong>
          <template v-if="trainer.debuffsVisible.value">
            <span class="assignment-icons">
              <span class="debuff-icons">
                <img
                  v-if="trainer.remainingLayers.value[member.id] > 0"
                  :src="MECHANIC_ICONS[trainer.remainingLayers.value[member.id] === 1 ? 'subtractionOne' : trainer.remainingLayers.value[member.id] === 2 ? 'subtractionTwo' : 'subtractionThree']"
                  :alt="`減算炸彈 ${trainer.remainingLayers.value[member.id]} 層`"
                />
                <b v-else class="cleared-layer">0</b>
                <img v-if="member.explosionTarget" :src="MECHANIC_ICONS.lalaruStack" alt="分攤目標" />
              </span>
              <img :src="MECHANIC_ICONS[member.multiplier === 'III' ? 'multiplyIII' : 'multiplyV']" :alt="member.multiplier" />
              <span class="forward-debuff">
                <img :src="MECHANIC_ICONS.lalaruForward" alt="前進" />
                <strong class="debuff-countdown">{{ trainer.remainingSeconds.value }}s</strong>
              </span>
            </span>
            <span class="target" :class="{ active: member.explosionTarget }">{{ member.explosionTarget ? '分攤目標' : '一般目標' }}</span>
          </template>
          <span v-else class="assignment-pending">等待提示</span>
        </article>
      </TrainerPartyAssignment>
      <LalaRuCheatSheet class="embedded-cheat-sheet" default-view="player" />
    </template>

    <template #status>
      <TrainerStats
        :round="trainer.round.value"
        :wins="trainer.successes.value"
        :streak="trainer.streak.value"
        wins-label="處理成功"
      />
      <TrainerStageCard
        :badge="stageBadge"
        :clock="stageClock"
        :clock-tone="trainer.phase.value === 'idle' ? 'muted' : 'default'"
        :title="stageTitle"
        :status="stageDescription"
        :progress="stageProgress"
      />
    </template>

    <template #actions>
      <TrainerActionRow>
        <button
          class="primary-button"
          type="button"
          :disabled="trainer.phase.value !== 'preparing' || trainer.placementConfirmed.value || !trainer.placementSelected.value"
          @click="trainer.confirmPlacement"
        >{{ trainer.placementConfirmed.value ? '站位已確認' : '確認我的站位' }}</button>
        <button class="secondary-button" type="button" :disabled="trainer.phase.value === 'idle'" @click="trainer.restart">重新開始練習</button>
        <button class="secondary-button" type="button" @click="trainer.nextQuestion">隨機下一題</button>
      </TrainerActionRow>
      <p class="phase-note">
        {{ trainer.placementConfirmed.value
          ? '隊友站位已揭示，可旋轉視角核對相對配置。'
          : '作答期間只顯示自己；確認站位後才揭示隊友。' }}
      </p>
    </template>

    <template #dialogs>
      <DeathDialog
        :open="trainer.deathDialogOpen.value"
        :reason="`死因：${trainer.failureReason.value}`"
        @retry="trainer.restart"
        @next="trainer.nextQuestion"
        @close="trainer.closeDeathDialog"
      />
    </template>
  </TrainerPageShell>
</template>

<style scoped>
.switch-row input[type="radio"] { border-radius: 50%; }
.assignment-card { cursor: default; }
.assignment-icons { display: flex; min-width: 0; align-items: center; justify-content: center; gap: 4px; }
.assignment-icons > img { width: 20px; height: 26px; object-fit: contain; }
.debuff-icons { display: flex; align-items: center; gap: 2px; }.debuff-icons img { width: 24px; height: 30px; object-fit: contain; }.assignment-card .target { color: #718793; font-size: var(--type-helper); line-height: var(--leading-compact); }.assignment-card .target.active { color: #c9a9ff; font-weight: 800; }
.assignment-pending { color: var(--text-helper); font-size: var(--type-body); }
.debuff-icons .cleared-layer { display: grid; width: 27px; height: 27px; place-items: center; border: 1px solid #69daa5; border-radius: 5px; color: #86ffc0; background: #0b3028; font: 900 13px ui-monospace, monospace; }
.forward-debuff { display: grid; align-items: center; justify-items: center; gap: 0; }.forward-debuff img { width: 20px; height: 25px; object-fit: contain; }.forward-debuff .debuff-countdown { color: #f2f8fb; font: 800 10px ui-monospace, monospace; line-height: 1; }
</style>
