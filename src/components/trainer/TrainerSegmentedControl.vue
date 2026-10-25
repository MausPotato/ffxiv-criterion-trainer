<script setup lang="ts">
export interface TrainerSegmentOption {
  value: string;
  label: string;
}

defineProps<{
  modelValue: string;
  options: readonly TrainerSegmentOption[];
  label: string;
  disabled?: boolean;
}>();

defineEmits<{
  change: [value: string];
}>();
</script>

<template>
  <div class="segmented-control" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      class="segment-button"
      :class="{ selected: modelValue === option.value }"
      type="button"
      :aria-pressed="modelValue === option.value"
      :disabled="disabled"
      @click="$emit('change', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
