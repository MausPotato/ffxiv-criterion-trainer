<script setup lang="ts">
import { computed } from 'vue';
import LalaRuSummonedDollsArena from '../components/lalaru/LalaRuSummonedDollsArena.vue';
import TrainerActionRow from '../components/trainer/TrainerActionRow.vue';
import TrainerPageShell from '../components/trainer/TrainerPageShell.vue';
import TrainerPartyAssignment from '../components/trainer/TrainerPartyAssignment.vue';
import TrainerStageCard from '../components/trainer/TrainerStageCard.vue';
import TrainerStats from '../components/trainer/TrainerStats.vue';
import { useLalaRuSummonedDollsTrainer } from '../composables/useLalaRuSummonedDollsTrainer.ts';
import { trainerNavigationFor } from '../navigation/trainer-navigation.ts';

const trainer = useLalaRuSummonedDollsTrainer();
const lalaruNavigation = trainerNavigationFor('lalaru');
const stageClock = computed(() => !trainer.started.value
  ? '待開始'
  : `${trainer.activeEventIndex.value + 1} / ${trainer.scenario.implementedEventIds.length}`);
const stageTitle = computed(() => trainer.currentEvent.value?.label ?? '準備就緒');
const stageDescription = computed(() => trainer.currentEvent.value?.description
  ?? '本階段使用固定北側範例，時間與真實路徑尚未校正。');
</script>

<template>
  <TrainerPageShell
    class="summoned-dolls-page"
    title="拉拉魯｜召喚人偶"
    description="檢視三隻人偶的直線 AOE、變光魔紋地板狀態與第一次爆炸。"
    :navigation="lalaruNavigation"
    navigation-label="拉拉魯機制選擇"
    arena-label="拉拉魯召喚人偶練習場地"
  >
    <template #arena>
      <LalaRuSummonedDollsArena
        :scenario="trainer.scenario"
        :floor-cells="trainer.floorCells.value"
        :current-event="trainer.currentEvent.value"
        :complete="trainer.complete.value"
        :selected-player-id="trainer.selectedPlayerId.value"
        @start="trainer.start"
      />
    </template>

    <template #assignment>
      <TrainerPartyAssignment
        title="隊伍與分攤"
        summary="D1、D2 持有分攤 BUFF"
        note="本階段僅顯示 BUFF；最終兩組分攤判定尚未實作。"
      >
        <button
          v-for="member in trainer.scenario.party"
          :key="member.id"
          type="button"
          class="role-card assignment-card"
          :class="[member.role, { selected: trainer.selectedPlayerId.value === member.id }]"
          :aria-pressed="trainer.selectedPlayerId.value === member.id"
          :aria-label="`選擇 ${member.label} 作為操作角色`"
          @click="trainer.selectPlayer(member.id)"
        >
          <strong>{{ member.label }}</strong>
          <span>{{ member.role === 'tank' ? '防護' : member.role === 'healer' ? '治療' : 'DPS' }}</span>
          <b v-if="member.hasStackBuff">分攤 BUFF</b>
          <i v-if="trainer.selectedPlayerId.value === member.id" aria-hidden="true">✓</i>
        </button>
      </TrainerPartyAssignment>
    </template>

    <template #status>
      <TrainerStats
        :round="trainer.attempts.value"
        :wins="0"
        round-label="展示"
        wins-label="判定"
        :show-streak="false"
      />
      <TrainerStageCard
        badge="第一階段"
        :clock="stageClock"
        :clock-tone="trainer.started.value ? 'default' : 'muted'"
        :title="stageTitle"
        :status="stageDescription"
        :progress="trainer.progress.value"
      >
        <dl class="trainer-info-grid">
          <div><dt>小怪方向</dt><dd>北</dd></div>
          <div><dt>攻擊列</dt><dd>1・3・5</dd></div>
          <div><dt>保留列</dt><dd>2・4</dd></div>
          <div><dt>地板格數</dt><dd>5 × 5</dd></div>
        </dl>
      </TrainerStageCard>
    </template>

    <template #timeline>
      <section class="event-spec" aria-label="事件順序">
        <div class="role-heading"><span>事件規格</span><small>後半段僅預留</small></div>
        <ol>
          <li
            v-for="event in trainer.scenario.events"
            :key="event.id"
            :class="{ active: trainer.currentEvent.value?.id === event.id, pending: !event.implemented }"
          >
            <span>{{ event.label }}</span><small>{{ event.implemented ? '第一階段' : '待實作' }}</small>
          </li>
        </ol>
      </section>
    </template>

    <template #actions>
      <TrainerActionRow>
        <button class="primary-button" type="button" :disabled="!trainer.canAdvance.value" @click="trainer.advance">
          {{ trainer.complete.value ? '前半段完成' : '下一事件' }}
        </button>
        <button class="secondary-button" type="button" :disabled="!trainer.started.value" @click="trainer.restart">重新開始</button>
        <button class="secondary-button" type="button" :disabled="!trainer.started.value" @click="trainer.reset">重置</button>
      </TrainerActionRow>
      <p class="phase-note">事件由統一狀態手動推進，不使用未確認的遊戲時間。</p>
    </template>
  </TrainerPageShell>
</template>

<style scoped>
.assignment-card { cursor: pointer; }.assignment-card > span { color: var(--text-helper); font-size: var(--type-helper); }.assignment-card > b { color: #e5c2ff; font-size: var(--type-helper); }.assignment-card.healer { border-color: rgba(91, 205, 126, .72); }.assignment-card.dps { border-color: rgba(224, 91, 105, .72); }.assignment-card.selected { position: relative; box-shadow: inset 0 0 0 1px rgba(225, 249, 255, .35), 0 0 0 2px #75d9ed; }.assignment-card.selected > i { position: absolute; top: 5px; right: 6px; display: grid; width: 18px; height: 18px; place-items: center; border-radius: 50%; color: #08202a; background: #bdefff; font-size: 12px; font-style: normal; font-weight: 900; }
.event-spec ol { display: grid; gap: 4px; margin: 8px 0 0; padding: 0; list-style: none; }.event-spec li { display: flex; justify-content: space-between; gap: 8px; padding: 5px 7px; border-left: 2px solid #36566a; color: var(--text-secondary); background: rgba(8, 22, 30, .34); font-size: var(--type-helper); }.event-spec li.active { border-left-color: #58cce4; color: #effcff; background: rgba(47, 131, 151, .18); }.event-spec li.pending { opacity: .56; }.event-spec small { color: var(--text-helper); white-space: nowrap; }
.summoned-dolls-page :deep(.control-panel) { overscroll-behavior: contain; }
@media (max-width: 760px) {
  .summoned-dolls-page :deep(.trainer-heading > div),
  .summoned-dolls-page :deep(.trainer-layout),
  .summoned-dolls-page :deep(.arena-panel),
  .summoned-dolls-page :deep(.control-panel) { width: 100%; min-width: 0; }
  .summoned-dolls-page :deep(.trainer-heading p) { overflow-wrap: anywhere; }
}
</style>
