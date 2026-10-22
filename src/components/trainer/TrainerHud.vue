<script setup lang="ts">
defineProps<{
  round: number;
  wins: number;
  streak: number;
  stageName: string;
  status: string;
  ready: boolean;
}>();
</script>

<template>
  <section class="hud-section" aria-label="練習狀態">
    <div class="hud-grid">
      <div class="hud-stat"><span>題目</span><strong>{{ round.toString().padStart(2, '0') }}</strong></div>
      <div class="hud-stat"><span>站位通過</span><strong>{{ wins }}</strong></div>
      <div class="hud-stat"><span>連勝</span><strong>{{ streak }}</strong></div>
    </div>

    <div class="stage-card">
      <div class="stage-topline">
        <span class="stage-pill">{{ ready ? '階段 1／3' : '準備階段' }}</span>
        <span class="stage-clock">{{ ready ? 'BUFF 24.0' : '⏸ WAITING' }}</span>
      </div>
      <h2>{{ stageName }}</h2>
      <p>{{ status }}</p>
      <div class="stage-progress"><span :style="{ width: ready ? '0%' : '0%' }"></span></div>
    </div>

    <div class="action-row">
      <button class="primary-button" type="button" disabled>確認排隊</button>
      <button class="secondary-button" type="button" disabled>下一步</button>
      <button class="secondary-button" type="button" disabled>重設本階段</button>
    </div>
    <p class="phase-note">本階段完成靜態元件與狀態介面；棋盤點選、計時及結算尚未啟用。</p>
  </section>
</template>
