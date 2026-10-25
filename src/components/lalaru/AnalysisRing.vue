<script setup lang="ts">
import { computed } from 'vue';
import type { AnalysisDebuff } from '../../mechanics/lalaru/analysis.ts';
import { analysisRingPath } from '../../presentation/lalaru/analysis-cue.ts';

const props = withDefaults(defineProps<{
  facingAngle: number;
  debuff: AnalysisDebuff;
  additionalRotationDegrees?: number;
}>(), { additionalRotationDegrees: 0 });
const path = computed(() => analysisRingPath(
  props.facingAngle,
  props.debuff,
  40,
  undefined,
  props.additionalRotationDegrees
));
</script>

<template>
  <svg class="analysis-ring" viewBox="0 0 100 100" aria-hidden="true">
    <path :d="path" />
  </svg>
</template>

<style scoped>
.analysis-ring { position: absolute; top: 50%; left: 50%; z-index: 2; width: 310%; height: 310%; overflow: visible; transform: translate(-50%, -50%); pointer-events: none; }
.analysis-ring path { fill: none; stroke: #f5cf70; stroke-width: 9; stroke-linecap: round; filter: drop-shadow(0 0 4px rgba(255, 208, 91, .85)); }
</style>
