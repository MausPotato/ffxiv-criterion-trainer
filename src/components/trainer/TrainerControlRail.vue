<script setup lang="ts">
withDefaults(defineProps<{
  ariaLabel?: string;
}>(), {
  ariaLabel: '訓練控制'
});
</script>

<template>
  <aside class="control-panel panel trainer-control-stack" :aria-label="ariaLabel">
    <div v-if="$slots.settings" class="trainer-control-region" data-trainer-region="settings">
      <slot name="settings"></slot>
    </div>
    <div v-if="$slots.assignment" class="trainer-control-region" data-trainer-region="assignment">
      <slot name="assignment"></slot>
    </div>
    <div v-if="$slots.context" class="trainer-control-region" data-trainer-region="context">
      <slot name="context"></slot>
    </div>
    <div
      v-if="$slots.status"
      class="trainer-control-region"
      data-trainer-region="status"
      aria-live="polite"
    >
      <slot name="status"></slot>
    </div>
    <div v-if="$slots.timeline" class="trainer-control-region" data-trainer-region="timeline">
      <slot name="timeline"></slot>
    </div>
    <div v-if="$slots.actions" class="trainer-control-region" data-trainer-region="actions">
      <slot name="actions"></slot>
    </div>
    <div v-if="$slots.review" class="trainer-control-region" data-trainer-region="review">
      <slot name="review"></slot>
    </div>
  </aside>
</template>

<style scoped>
.trainer-control-stack {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.trainer-control-region {
  min-width: 0;
}

.trainer-control-region :deep(h2) {
  margin: 0;
  font-size: var(--type-section);
  line-height: 1.25;
}

.trainer-control-region + .trainer-control-region {
  margin-top: var(--space-section);
  padding-top: var(--space-section);
  border-top: 1px solid var(--line-soft);
}

.trainer-control-region > :deep(.hud-section),
.trainer-control-region > :deep(.cheat-sheet) {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.trainer-control-region > :deep(.action-row) {
  margin-top: 0;
}
</style>
