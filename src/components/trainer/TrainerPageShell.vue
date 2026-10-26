<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { TrainerNavigationItem } from '../../navigation/trainer-navigation.ts';
import TrainerControlRail from './TrainerControlRail.vue';

withDefaults(defineProps<{
  title: string;
  description: string;
  version: string;
  navigation: readonly TrainerNavigationItem[];
  navigationLabel: string;
  backTo?: string;
  backLabel?: string;
  arenaLabel?: string;
  controlsLabel?: string;
}>(), {
  backTo: '/',
  backLabel: '← 回到迷宮一覽',
  arenaLabel: '機制練習場地',
  controlsLabel: '訓練控制'
});
</script>

<template>
  <main class="trainer-page trainer-page-shell">
    <div class="trainer-heading">
      <div>
        <RouterLink class="back-link" :to="backTo">{{ backLabel }}</RouterLink>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <span class="version-chip">{{ version }}</span>
    </div>

    <nav class="mechanic-nav" :aria-label="navigationLabel">
      <RouterLink
        v-for="item in navigation"
        :key="item.id"
        :to="item.to"
        active-class="active"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="trainer-layout">
      <section class="arena-panel panel" :aria-label="arenaLabel">
        <slot name="arena"></slot>
      </section>

      <TrainerControlRail :aria-label="controlsLabel">
        <template v-if="$slots.settings" #settings><slot name="settings"></slot></template>
        <template v-if="$slots.assignment" #assignment><slot name="assignment"></slot></template>
        <template v-if="$slots.context" #context><slot name="context"></slot></template>
        <template v-if="$slots.status" #status><slot name="status"></slot></template>
        <template v-if="$slots.timeline" #timeline><slot name="timeline"></slot></template>
        <template v-if="$slots.actions" #actions><slot name="actions"></slot></template>
        <template v-if="$slots.review" #review><slot name="review"></slot></template>
      </TrainerControlRail>
    </div>

    <slot name="dialogs"></slot>
  </main>
</template>

<style scoped>
.trainer-page-shell {
  user-select: none;
  -webkit-user-select: none;
}

/* Compatibility bridge until the analysis arena itself is migrated to TrainerStartOverlay. */
.arena-panel :deep(.analysis-start-overlay) {
  z-index: 40;
  overflow: hidden;
  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 47%, rgba(35, 92, 108, .2), transparent 11rem),
    #07131c;
  backdrop-filter: none;
}

.arena-panel :deep(.analysis-start-overlay .start-rune) {
  display: block;
  height: 32px;
  font-size: 30px;
  line-height: 32px;
}

.arena-panel :deep(.analysis-start-overlay .start-button) {
  width: 128px;
  min-height: 52px;
  padding: 12px 18px;
  font-size: 17px;
}

.arena-panel :deep(.analysis-start-overlay small) {
  width: min(80%, 440px);
  min-height: 36px;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

@media (max-width: 760px) {
  .mechanic-nav {
    overflow-x: auto;
    scrollbar-width: none;
  }

  .mechanic-nav::-webkit-scrollbar {
    display: none;
  }

  .mechanic-nav a {
    flex: 0 0 auto;
  }
}
</style>
