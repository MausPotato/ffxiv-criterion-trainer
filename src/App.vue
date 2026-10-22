<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/" aria-label="回到首頁">
        <span class="brand-gem" aria-hidden="true">◆</span>
        <span>
          <strong>異聞演練所</strong>
          <small>FF14 Criterion Trainer</small>
        </span>
      </RouterLink>
      <nav aria-label="主要導覽">
        <RouterLink to="/">迷宮一覽</RouterLink>
        <RouterLink to="/aloalo-island/ketuduke">凱圖嘟凱</RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
