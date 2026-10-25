<script setup lang="ts">
withDefaults(defineProps<{
  round: number;
  wins: number;
  streak?: number;
  roundLabel?: string;
  winsLabel?: string;
  streakLabel?: string;
  showStreak?: boolean;
}>(), {
  streak: 0,
  roundLabel: '題目',
  winsLabel: '站位通過',
  streakLabel: '連勝',
  showStreak: true
});
</script>

<template>
  <div class="hud-grid" :class="{ 'two-column': !showStreak }">
    <div class="hud-stat"><span>{{ roundLabel }}</span><strong>{{ round.toString().padStart(2, '0') }}</strong></div>
    <div class="hud-stat"><span>{{ winsLabel }}</span><strong>{{ wins }}</strong></div>
    <div v-if="showStreak" class="hud-stat"><span>{{ streakLabel }}</span><strong>{{ streak }}</strong></div>
  </div>
</template>
