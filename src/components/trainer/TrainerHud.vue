<script setup lang="ts">
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
}>();

defineEmits<{
  confirm: [];
  next: [];
  reset: [];
}>();
</script>

<template>
  <section class="hud-section" aria-label="練習狀態">
    <div class="hud-grid">
      <div class="hud-stat"><span>題目</span><strong>{{ round.toString().padStart(2, '0') }}</strong></div>
      <div class="hud-stat"><span>站位通過</span><strong>{{ wins }}</strong></div>
      <div class="hud-stat"><span>連勝</span><strong>{{ streak }}</strong></div>
    </div>

    <div class="stage-card">
      <div class="stage-topline">
        <span class="stage-pill">{{ stageBadge }}</span>
        <span class="stage-clock">{{ clockText }}</span>
      </div>
      <h2>{{ stageName }}</h2>
      <p>{{ status }}</p>
      <div class="stage-progress"><span :style="{ width: `${progress}%` }"></span></div>
    </div>

    <div class="action-row">
      <button class="primary-button" type="button" :disabled="confirmDisabled" @click="$emit('confirm')">{{ confirmText }}</button>
      <button class="secondary-button" type="button" :disabled="nextDisabled" @click="$emit('next')">揭示麻將</button>
      <button class="secondary-button" type="button" :disabled="resetDisabled" @click="$emit('reset')">重設本階段</button>
    </div>
    <p class="phase-note">吹風位移與最終安全區結算將於下一部分接入。</p>
  </section>
</template>
