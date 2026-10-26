<script setup lang="ts">
withDefaults(defineProps<{
  description: string;
  buttonLabel?: string;
}>(), {
  buttonLabel: '開始練習'
});

const emit = defineEmits<{ start: [] }>();
</script>

<template>
  <div class="trainer-start-overlay">
    <span class="trainer-start-rune" aria-hidden="true">◇</span>
    <button class="primary-button trainer-start-button" type="button" @click="emit('start')">
      {{ buttonLabel }}
    </button>
    <small>{{ description }}</small>
  </div>
</template>

<style scoped>
.trainer-start-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  overflow: hidden;
  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 47%, rgba(35, 92, 108, .2), transparent 11rem),
    #07131c;
}

.trainer-start-rune {
  display: block;
  height: 32px;
  color: #65d7ed;
  font-size: 30px;
  line-height: 32px;
  text-shadow: 0 0 22px #52d1ec;
}

.trainer-start-button {
  width: 128px;
  min-height: 52px;
  padding: 12px 18px;
  font-size: 17px;
}

.trainer-start-overlay small {
  width: min(80%, 440px);
  min-height: 36px;
  color: #b5c9d3;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}
</style>
