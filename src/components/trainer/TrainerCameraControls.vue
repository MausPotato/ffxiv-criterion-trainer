<script setup lang="ts">
withDefaults(defineProps<{
  rotation: number;
  disabled?: boolean;
  stepDegrees?: number;
  resetLabel?: string;
  instructions?: string;
}>(), {
  disabled: false,
  stepDegrees: 90,
  resetLabel: '重置視角',
  instructions: '右鍵水平拖曳旋轉視角'
});

defineEmits<{
  rotate: [degrees: number];
  reset: [];
}>();
</script>

<template>
  <div class="camera-control-group">
    <div class="camera-controls" aria-label="視角控制">
      <button class="secondary-button" type="button" :disabled="disabled" @click="$emit('rotate', -stepDegrees)">逆時針 {{ stepDegrees }}°</button>
      <button class="secondary-button" type="button" :disabled="disabled" @click="$emit('reset')">{{ resetLabel }}</button>
      <button class="secondary-button" type="button" :disabled="disabled" @click="$emit('rotate', stepDegrees)">順時針 {{ stepDegrees }}°</button>
    </div>
    <p class="camera-readout">{{ instructions }} · {{ Math.round(rotation) }}°</p>
  </div>
</template>
