<script setup lang="ts">
withDefaults(defineProps<{
  badge: string;
  clock: string;
  title: string;
  status: string;
  progress?: number | null;
}>(), {
  progress: null
});
</script>

<template>
  <div class="stage-card">
    <div class="stage-topline">
      <span class="stage-pill">{{ badge }}</span>
      <span class="stage-clock">{{ clock }}</span>
    </div>
    <h2>{{ title }}</h2>
    <p>{{ status }}</p>
    <slot></slot>
    <div v-if="progress !== null" class="stage-progress"><span :style="{ width: `${progress}%` }"></span></div>
  </div>
</template>
