<script setup lang="ts">
defineProps<{
  open: boolean;
  reason: string;
}>();

defineEmits<{
  close: [];
  retry: [];
  next: [];
}>();
</script>

<template>
  <div v-if="open" class="death-overlay" role="dialog" aria-modal="true" aria-labelledby="death-title">
    <div class="death-card">
      <p class="death-code">DUTY FAILED</p>
      <h2 id="death-title">YOU DIED</h2>
      <p>{{ reason }}</p>
      <div class="death-actions">
        <button type="button" @click="$emit('retry')">重試同一題</button>
        <button type="button" @click="$emit('next')">下一題</button>
        <button type="button" @click="$emit('close')">查看棋盤</button>
      </div>
    </div>
  </div>
</template>
