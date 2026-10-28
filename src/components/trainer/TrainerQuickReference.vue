<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  defaultOpen?: boolean;
}>(), {
  defaultOpen: false
});
</script>

<template>
  <details class="quick-reference" :open="defaultOpen">
    <summary class="control-section-heading quick-reference-summary">
      <span>
        <span class="section-kicker">QUICK REFERENCE</span>
        <span class="section-title">{{ title }}</span>
      </span>
      <span class="quick-reference-indicator" aria-hidden="true"></span>
    </summary>
    <div class="quick-reference-content">
      <slot></slot>
    </div>
  </details>
</template>

<style scoped>
.quick-reference { border: 1px solid var(--line-soft); border-radius: var(--radius-card); background: rgba(8, 17, 24, .3); }
.quick-reference.embedded-cheat-sheet { margin-top: var(--space-section); }
.quick-reference-summary { display: flex; min-height: 54px; align-items: center; justify-content: space-between; gap: var(--space-section); padding: 10px 12px; cursor: pointer; list-style: none; }
.quick-reference-summary::-webkit-details-marker { display: none; }
.quick-reference[open] .quick-reference-summary { margin-bottom: var(--space-section); border-bottom: 1px solid var(--line-soft); }
.quick-reference-summary > span:first-child { display: grid; min-width: 0; gap: 0; }
.quick-reference-indicator { width: 9px; height: 9px; flex: 0 0 auto; border-right: 2px solid var(--text-helper); border-bottom: 2px solid var(--text-helper); transform: rotate(45deg) translate(-2px, 2px); transition: transform .16s ease; }
.quick-reference[open] .quick-reference-indicator { transform: rotate(225deg) translate(-2px, 2px); }
.quick-reference-content { display: grid; gap: var(--space-section); padding: 0 10px 10px; }

@media (max-width: 390px) {
  .quick-reference-summary { padding-inline: 10px; }
  .quick-reference-content { padding-inline: 8px; }
}
</style>
