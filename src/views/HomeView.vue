<script setup lang="ts">
import { RouterLink } from 'vue-router';

interface DungeonCard {
  number: string;
  name: string;
  subtitle: string;
  accent: 'amber' | 'violet' | 'cyan';
  status: string;
  to?: string;
  secondaryTo?: string;
}

const dungeons: readonly DungeonCard[] = [
  {
    number: '01',
    name: '希拉狄哈水道',
    subtitle: 'Another Sil’dihn Subterrane',
    accent: 'amber',
    status: '準備中'
  },
  {
    number: '02',
    name: '六根山',
    subtitle: 'Another Mount Rokkon',
    accent: 'violet',
    status: '準備中'
  },
  {
    number: '03',
    name: '阿羅阿羅島',
    subtitle: 'Another Aloalo Island',
    accent: 'cyan',
    status: '可練習',
    to: '/aloalo-island/ketuduke',
    secondaryTo: '/aloalo-island/lalaru/rotation'
  }
];
</script>

<template>
  <main class="home-page page-wrap">
    <section class="hero">
      <p class="eyebrow">VARIANT DUNGEON · MECHANIC LAB</p>
      <h1>把機制拆成一步一步，<br><span>練到判斷成為直覺。</span></h1>
      <p class="hero-copy">
        FF14 異聞迷宮單人演練工具。選擇迷宮與機制，在不影響隊友的情況下反覆熟悉站位。
      </p>
    </section>

    <section class="dungeon-section" aria-labelledby="dungeon-heading">
      <div class="section-heading">
        <div>
          <p class="eyebrow">TRAINING ARCHIVE</p>
          <h2 id="dungeon-heading">選擇異聞迷宮</h2>
        </div>
        <span class="archive-count">03 DUNGEONS</span>
      </div>

      <div class="dungeon-grid">
        <article
          v-for="dungeon in dungeons"
          :key="dungeon.number"
          class="dungeon-card"
          :class="[
            `accent-${dungeon.accent}`,
            { available: dungeon.to, 'has-secondary-action': dungeon.secondaryTo }
          ]"
        >
          <div class="card-orbit" aria-hidden="true"></div>
          <div class="card-topline">
            <span class="card-number">{{ dungeon.number }}</span>
            <span class="status-pill" :class="{ live: dungeon.to }">{{ dungeon.status }}</span>
          </div>
          <div class="dungeon-emblem" aria-hidden="true">
            <span>◆</span>
          </div>
          <div class="card-copy">
            <p>{{ dungeon.subtitle }}</p>
            <h3>{{ dungeon.name }}</h3>
          </div>
          <div v-if="dungeon.to" class="card-action-group">
            <RouterLink class="card-action" :to="dungeon.to">
              一王・凱圖嘟凱 <span aria-hidden="true">→</span>
            </RouterLink>
            <RouterLink v-if="dungeon.secondaryTo" class="card-action" :to="dungeon.secondaryTo">
              二王・拉拉魯 <span aria-hidden="true">→</span>
            </RouterLink>
          </div>
          <span v-else class="card-action disabled">機制整理中</span>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.card-action-group {
  position: absolute;
  right: 22px;
  bottom: 18px;
  left: 22px;
  z-index: 2;
  display: grid;
}

.card-action-group .card-action {
  position: static;
  min-height: 36px;
  margin: 0;
  padding: 8px 0;
}

.dungeon-card.has-secondary-action {
  min-height: 340px;
}

.dungeon-card.has-secondary-action .dungeon-emblem {
  width: 84px;
  height: 84px;
  margin: 30px auto 20px;
}
</style>
