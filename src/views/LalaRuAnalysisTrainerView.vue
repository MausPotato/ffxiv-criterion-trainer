<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import LalaRuAnalysisArena from '../components/lalaru/LalaRuAnalysisArena.vue';
import { useLalaRuAnalysisTrainer } from '../composables/useLalaRuAnalysisTrainer.ts';
import { ANALYSIS_GAP_HALF_ANGLE_DEGREES, ANALYSIS_TIMING, type AnalysisDebuff } from '../mechanics/lalaru/index.ts';

const trainer = useLalaRuAnalysisTrainer();
const debuffLabels: Readonly<Record<AnalysisDebuff, string>> = {
  front: '正面未解析', back: '背面未解析', left: '左側未解析', right: '右側未解析'
};
const preventContextMenu = (event: MouseEvent): void => event.preventDefault();
onMounted(() => document.addEventListener('contextmenu', preventContextMenu));
onBeforeUnmount(() => document.removeEventListener('contextmenu', preventContextMenu));
</script>

<template>
  <main class="analysis-page">
    <div class="analysis-heading">
      <div>
        <RouterLink class="back-link" to="/">← 回到迷宮一覽</RouterLink>
        <h1>拉拉魯｜分析方向</h1>
        <p>調整位置與角色面向，讓光球攻擊進入金色 C 字環的缺口。</p>
      </div>
      <span class="version-chip">ANALYSIS · FOUNDATION</span>
    </div>

    <nav class="mechanic-nav" aria-label="拉拉魯機制選擇">
      <RouterLink to="/aloalo-island/lalaru/rotation">旋轉角乘算</RouterLink>
      <RouterLink to="/aloalo-island/lalaru/composite-pattern">複合魔紋</RouterLink>
    </nav>

    <div class="analysis-layout">
      <section class="panel analysis-arena-panel">
        <LalaRuAnalysisArena
          :phase="trainer.phase.value"
          :player-position="trainer.playerPosition.value"
          :player-facing-angle="trainer.playerFacingAngle.value"
          :orb-position="trainer.question.value.orbPosition"
          :debuff="trainer.question.value.debuff"
          :result="trainer.result.value"
          :explosion-key="trainer.explosionKey.value"
          @start="trainer.start"
          @update-player-position="trainer.setPlayerPosition"
          @update-player-facing-angle="trainer.setPlayerFacingAngle"
        />
      </section>

      <aside class="panel analysis-control-panel">
        <section>
          <p class="section-kicker">ANALYSIS DEBUFF</p>
          <h2>{{ debuffLabels[trainer.question.value.debuff] }}</h2>
          <p class="mode-description">缺口中心為角色的{{ trainer.question.value.debuff === 'front' ? '正面' : trainer.question.value.debuff === 'back' ? '背面' : trainer.question.value.debuff === 'left' ? '左側' : '右側' }}，暫定容許角度 ±{{ ANALYSIS_GAP_HALF_ANGLE_DEGREES }}°。</p>
          <div class="debuff-grid" aria-label="四種分析方向">
            <span v-for="debuff in (['front', 'back', 'left', 'right'] as AnalysisDebuff[])" :key="debuff" :class="{ active: trainer.question.value.debuff === debuff }">{{ debuffLabels[debuff] }}</span>
          </div>
        </section>

        <section>
          <p class="section-kicker">CONTROLS</p>
          <h2>操作</h2>
          <ul class="control-help">
            <li><strong>WASD／方向鍵</strong><span>依畫面方向持續移動</span></li>
            <li><strong>Q／E</strong><span>原地逆時針／順時針轉向</span></li>
            <li><strong>左鍵拖曳</strong><span>移動角色並更新面向</span></li>
            <li><strong>右鍵拖曳</strong><span>旋轉鏡頭，不改變世界面向</span></li>
          </ul>
        </section>

        <section class="analysis-status-card" aria-live="polite">
          <div class="status-heading">
            <span>{{ trainer.phase.value.toUpperCase() }}</span>
            <strong v-if="trainer.phase.value === 'active'">{{ ANALYSIS_TIMING.resolveMs / 1000 }} 秒後引爆</strong>
            <strong v-else-if="trainer.phase.value === 'resolved'" :class="trainer.result.value ? 'success' : 'failure'">{{ trainer.result.value ? '缺口接到攻擊' : '方向不符' }}</strong>
            <strong v-else>等待開始</strong>
          </div>
          <dl class="angle-grid">
            <div><dt>世界面向</dt><dd>{{ Math.round(trainer.playerFacingAngle.value) }}°</dd></div>
            <div><dt>缺口中心</dt><dd>{{ Math.round(trainer.gapCenterAngle.value) }}°</dd></div>
            <div><dt>光球來源</dt><dd>{{ trainer.sourceAngle.value === null ? '重疊' : `${Math.round(trainer.sourceAngle.value)}°` }}</dd></div>
          </dl>
          <button v-if="trainer.phase.value === 'active'" class="secondary-button manual-resolve" type="button" @click="trainer.resolve">立即引爆檢查</button>
        </section>

        <section class="analysis-actions">
          <div class="score-line"><span>完成 {{ trainer.attempts.value }}</span><span>成功 {{ trainer.successes.value }}</span></div>
          <button v-if="trainer.phase.value === 'resolved'" class="secondary-button" type="button" @click="trainer.retry">同題重試</button>
          <button v-if="trainer.phase.value === 'resolved'" class="primary-button" type="button" @click="trainer.nextQuestion">隨機下一題</button>
          <button v-if="trainer.phase.value === 'idle'" class="primary-button wide" type="button" @click="trainer.start">開始</button>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.analysis-page { display: flex; width: min(1440px, calc(100% - 40px)); height: calc(100dvh - 72px); max-height: calc(100dvh - 72px); margin: 0 auto; padding: 8px 0; flex-direction: column; overflow: hidden; user-select: none; -webkit-user-select: none; }
.analysis-heading { display: flex; align-items: end; justify-content: space-between; flex: 0 0 auto; gap: 20px; margin-bottom: 6px; }
.analysis-heading h1 { margin: 2px 0 0; font-size: var(--type-page-title); letter-spacing: -.025em; line-height: 1.15; }
.analysis-heading > div > p:last-child { margin: 0; color: var(--text-helper); font-size: var(--type-body); line-height: var(--leading-compact); }
.back-link { display: inline-block; margin-bottom: 8px; color: #9ec5d2; font-size: 13px; text-decoration: none; }
.mechanic-nav { display: flex; flex: 0 0 auto; gap: 7px; margin: 0 0 7px; }
.mechanic-nav a { padding: 5px 10px; border: 1px solid var(--line-soft); border-radius: 999px; color: var(--text-secondary); background: #101c27; font-size: var(--type-secondary); text-decoration: none; }
.mechanic-nav a.active { border-color: #4dbbd3; color: #e8fbff; background: #173d49; }
.analysis-layout { display: grid; min-height: 0; flex: 1 1 auto; grid-template-columns: minmax(0, 1.08fr) minmax(420px, .92fr); gap: 11px; align-items: stretch; overflow: hidden; }
.analysis-arena-panel { display: grid; height: 100%; min-height: 0; min-width: 0; padding: 10px; overflow: hidden; place-items: center; container-type: size; }
.analysis-control-panel { display: flex; height: 100%; min-width: 0; flex-direction: column; gap: 12px; padding: 12px; overflow-y: auto; scrollbar-width: none; }
.analysis-control-panel::-webkit-scrollbar { display: none; } .analysis-control-panel section + section { padding-top: 13px; border-top: 1px solid var(--line-soft); }
.analysis-control-panel h2 { margin: 0; font-size: 19px; }
.mode-description { margin: 8px 0 0; color: var(--text-helper); font-size: 13px; line-height: 1.55; }
.debuff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 10px; }
.debuff-grid span { padding: 8px; border: 1px solid var(--line-soft); border-radius: 7px; color: var(--text-helper); background: #101c27; text-align: center; font-size: 12px; }
.debuff-grid span.active { border-color: #d9b458; color: #ffe7a0; background: #3c321c; }
.control-help { display: grid; gap: 7px; margin: 10px 0 0; padding: 0; list-style: none; }
.control-help li { display: flex; justify-content: space-between; gap: 12px; padding: 8px; border-radius: 7px; background: rgba(6, 17, 24, .34); font-size: 12px; }
.control-help span { color: var(--text-helper); text-align: right; }
.analysis-status-card { padding: 13px !important; border: 1px solid #345165 !important; border-radius: 10px; background: linear-gradient(135deg, #142a39, #12222e); }
.status-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; } .status-heading span { color: #7ed9ec; font: 750 11px ui-monospace, monospace; letter-spacing: .15em; } .status-heading strong { font-size: 14px; }
.success { color: #74e7aa; } .failure { color: #ff7784; }
.angle-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin: 12px 0 0; }
.angle-grid div { padding: 8px; border-radius: 7px; background: rgba(4, 15, 22, .34); } .angle-grid dt { color: var(--text-helper); font-size: 11px; } .angle-grid dd { margin: 3px 0 0; font: 700 13px ui-monospace, monospace; }
.manual-resolve { width: 100%; margin-top: 10px; padding: 9px; }
.analysis-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; } .analysis-actions button { padding: 10px; } .wide { grid-column: 1 / -1; }
.score-line { display: flex; grid-column: 1 / -1; justify-content: space-between; color: var(--text-helper); font: 12px ui-monospace, monospace; }
@media (max-width: 860px) { .analysis-page { display: block; height: auto; min-height: calc(100dvh - 72px); padding: 18px 0 32px; overflow: visible; } .analysis-layout { grid-template-columns: 1fr; overflow: visible; } .analysis-heading { align-items: start; } .analysis-arena-panel { height: auto; container-type: normal; } .analysis-control-panel { height: auto; overflow: visible; } }
@media (max-width: 520px) { .analysis-page { width: calc(100% - 20px); } .analysis-heading .version-chip { display: none; } .mechanic-nav { overflow-x: auto; } .mechanic-nav a { flex: 0 0 auto; } .analysis-arena-panel { padding: 7px; } }
</style>
