<script setup lang="ts">
withDefaults(defineProps<{
  title?: string;
  summary: string;
  note: string;
}>(), {
  title: '本題分配'
});
</script>

<template>
  <section class="party-assignment" :aria-label="title">
    <div class="role-heading">
      <span>{{ title }}</span>
      <small>{{ summary }}</small>
    </div>
    <div class="party-list role-grid">
      <slot></slot>
    </div>
    <div class="party-reveal-note">{{ note }}</div>
  </section>
</template>

<style scoped>
.party-list { margin-top: 10px; }
.party-reveal-note { width: 100%; margin-top: 6px; padding: 7px 10px; border: 1px solid var(--control-border); border-radius: var(--radius-control); color: var(--text-secondary); background: #203646; font-size: var(--type-body); text-align: center; }
@media (max-width: 720px) { .role-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
