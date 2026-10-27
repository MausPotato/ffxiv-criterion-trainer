<script setup lang="ts">
withDefaults(defineProps<{
  rotation: number;
  disabled?: boolean;
  visible?: boolean;
  stepDegrees?: number;
  resetLabel?: string;
  instructions?: string;
}>(), {
  disabled: false,
  visible: true,
  stepDegrees: 90,
  resetLabel: '重置視角',
  instructions: '右鍵拖曳調整視角'
});

defineEmits<{
  rotate: [degrees: number];
  reset: [];
}>();
</script>

<template>
  <div class="camera-control-slot">
    <div v-if="visible" class="camera-control-group">
      <div class="camera-controls" aria-label="視角控制">
        <button class="secondary-button" type="button" :disabled="disabled" @click="$emit('rotate', -stepDegrees)">逆時針 {{ stepDegrees }}°</button>
        <button class="secondary-button" type="button" :disabled="disabled" @click="$emit('reset')">{{ resetLabel }}</button>
        <button class="secondary-button" type="button" :disabled="disabled" @click="$emit('rotate', stepDegrees)">順時針 {{ stepDegrees }}°</button>
      </div>
      <p class="camera-readout">{{ instructions }} · {{ Math.round(rotation) }}°</p>
    </div>
  </div>
</template>

<style scoped>
.camera-control-slot {
  width: min(100%, 680px, calc(100cqh - 58px));
  min-height: 66px;
}

.camera-control-group {
  width: 100%;
}

.camera-readout { line-height: 14px; }

@media (max-width: 860px) {
  .camera-control-slot { width: min(100%, 680px); }
}

@media (max-width: 520px) {
  .camera-control-slot { min-height: 109px; }
}
</style>
