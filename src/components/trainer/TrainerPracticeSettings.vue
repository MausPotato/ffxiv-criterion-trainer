<script setup lang="ts">
withDefaults(defineProps<{
  title?: string;
  titleId?: string;
  kicker?: string;
}>(), {
  title: '練習設定',
  titleId: 'practice-settings-title',
  kicker: 'PRACTICE SETTINGS'
});
</script>

<template>
  <section class="practice-settings-section" :aria-labelledby="titleId">
    <div class="control-section-heading">
      <div>
        <p class="section-kicker">{{ kicker }}</p>
        <h2 :id="titleId">{{ title }}</h2>
      </div>
      <slot name="action"></slot>
    </div>
    <slot></slot>
  </section>
</template>
