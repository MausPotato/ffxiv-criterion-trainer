<script setup lang="ts">
import type { CrystalOrientation } from '../../mechanics/ketuduke/types.ts';

defineProps<{
  orientation: CrystalOrientation;
}>();
</script>

<template>
  <span class="crystal-marker" :class="orientation" aria-label="藍水晶"></span>
</template>
