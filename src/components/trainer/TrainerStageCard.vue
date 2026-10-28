<script setup lang="ts">
type TrainerStageClockTone = 'default' | 'muted';

withDefaults(defineProps<{
  badge: string;
  clock: string;
  clockTone?: TrainerStageClockTone;
  title: string;
  status: string;
  progress?: number | null;
}>(), {
  clockTone: 'default',
  progress: null
});
</script>

<template>
  <div class="stage-card">
    <div class="stage-topline">
      <span class="stage-pill">{{ badge }}</span>
      <span class="stage-clock" :class="`stage-clock-${clockTone}`">{{ clock }}</span>
    </div>
    <h2>{{ title }}</h2>
    <p>{{ status }}</p>
    <slot></slot>
    <div v-if="progress !== null" class="stage-progress"><span :style="{ width: `${progress}%` }"></span></div>
  </div>
</template>
