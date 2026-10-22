<script setup lang="ts">
import { RouterLink } from 'vue-router';
import ArenaBoard from '../components/trainer/ArenaBoard.vue';
import DeathDialog from '../components/trainer/DeathDialog.vue';
import TrainerControls from '../components/trainer/TrainerControls.vue';
import TrainerHud from '../components/trainer/TrainerHud.vue';
import { useKetudukeTrainer } from '../composables/useKetudukeTrainer.ts';

const trainer = useKetudukeTrainer();
</script>

<template>
  <main class="trainer-page">
    <div class="trainer-heading">
      <div>
        <RouterLink class="back-link" to="/">← 返回迷宮一覽</RouterLink>
        <h1>凱圖嘟凱・排隊法練習器</h1>
        <p>排隊 → 麻將 → 預站位 → 吹風｜單人實戰練習</p>
      </div>
      <span class="version-chip">VUE PREVIEW · PHASE 4A</span>
    </div>

    <div class="trainer-layout">
      <section class="arena-panel panel" aria-label="凱圖嘟凱四乘四練習場地">
        <ArenaBoard
          :question="trainer.question.value"
          :ready="trainer.ready.value"
          :focus="trainer.focus.value"
          :mah-visible="trainer.mahVisible.value"
          :phase="trainer.phase.value"
          :interactive="trainer.interactive.value"
          :queue-cells="trainer.queueCells.value"
          :positions="trainer.visiblePositions.value"
          @start="trainer.start"
          @select-cell="trainer.selectCell"
        />
      </section>

      <aside class="control-panel panel">
        <TrainerControls
          :focus="trainer.focus.value"
          :ready="trainer.ready.value"
          :question="trainer.question.value"
          :settings="trainer.settings.value"
          :hint-visible="trainer.hintVisible.value"
          :role-locked="trainer.lockPosition.value"
          :mahjong-run-hint="trainer.mahjongRunHint.value"
          @select-role="trainer.selectRole"
          @new-question="trainer.newQuestion"
          @toggle-hint="trainer.toggleHint"
          @update:timed="trainer.setTimed"
          @update:show-wind="trainer.setShowWind"
        />

        <TrainerHud
          :round="trainer.round.value"
          :wins="trainer.wins.value"
          :streak="trainer.streak.value"
          :stage-name="trainer.stageName.value"
          :status="trainer.status.value"
          :ready="trainer.ready.value"
          :stage-badge="trainer.stageBadge.value"
          :clock-text="trainer.clockText.value"
          :progress="trainer.progress.value"
          :confirm-text="trainer.confirmText.value"
          :confirm-disabled="trainer.confirmDisabled.value"
          :next-disabled="trainer.nextDisabled.value"
          :reset-disabled="trainer.resetDisabled.value"
          @confirm="trainer.confirm"
          @next="trainer.nextStep"
          @reset="trainer.resetStage"
        />
      </aside>
    </div>

    <DeathDialog
      :open="trainer.death.value.open"
      :reason="trainer.death.value.reason"
      @close="trainer.closeDeath"
      @retry="trainer.retry"
      @next="trainer.newQuestion"
    />
  </main>
</template>
