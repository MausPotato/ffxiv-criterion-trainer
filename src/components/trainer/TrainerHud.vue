<script setup lang="ts">
import TrainerStageCard from './TrainerStageCard.vue';
import TrainerStats from './TrainerStats.vue';
import TrainerActionRow from './TrainerActionRow.vue';

defineProps<{
  round: number;
  wins: number;
  streak: number;
  stageName: string;
  status: string;
  ready: boolean;
  stageBadge: string;
  clockText: string;
  progress: number;
  confirmText: string;
  confirmDisabled: boolean;
  nextDisabled: boolean;
  resetDisabled: boolean;
  resetText: string;
}>();

defineEmits<{
  confirm: [];
  next: [];
  reset: [];
}>();
</script>

<template>
  <section class="hud-section" aria-label="練習狀態">
    <TrainerStats :round="round" :wins="wins" :streak="streak" />

    <TrainerStageCard
      :badge="stageBadge"
      :clock="clockText"
      :title="stageName"
      :status="status"
      :progress="progress"
    />

    <TrainerActionRow>
      <button class="primary-button" type="button" :disabled="confirmDisabled" @click="$emit('confirm')">{{ confirmText }}</button>
      <button class="secondary-button" type="button" :disabled="nextDisabled" @click="$emit('next')">揭示麻將</button>
      <button class="secondary-button" type="button" :disabled="resetDisabled" @click="$emit('reset')">{{ resetText }}</button>
    </TrainerActionRow>
    <p class="phase-note">作答期間只顯示自己；吹風前站位通過後才揭示隊友並一起回放。</p>
  </section>
</template>
