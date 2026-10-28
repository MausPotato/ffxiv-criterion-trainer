<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { trainerNavigationGroupForPath } from './navigation/trainer-navigation.ts';

const route = useRoute();
const activeTrainerGroup = computed(() => trainerNavigationGroupForPath(route.path));
const isHome = computed(() => route.path === '/');
</script>

<template>
  <div class="app-shell">
    <header class="site-header" :class="{ 'home-header': isHome }">
      <RouterLink class="brand" to="/" aria-label="回到首頁">
        <span class="brand-gem" aria-hidden="true">◆</span>
        <span>
          <strong>異聞演練所</strong>
          <small>FF14 Criterion Trainer</small>
        </span>
      </RouterLink>
      <nav aria-label="主要導覽">
        <RouterLink to="/">迷宮一覽</RouterLink>
        <RouterLink
          v-if="!isHome"
          to="/aloalo-island/ketuduke"
          :class="{ 'router-link-active': activeTrainerGroup === 'ketuduke' }"
        >凱圖嘟凱</RouterLink>
        <RouterLink
          v-if="!isHome"
          to="/aloalo-island/lalaru/rotation"
          :class="{ 'router-link-active': activeTrainerGroup === 'lalaru' }"
        >拉拉魯</RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
