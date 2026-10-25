<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import LalaRuArena from '../components/lalaru/LalaRuArena.vue';
import LalaRuCheatSheet from '../components/lalaru/LalaRuCheatSheet.vue';
import { useLalaRuTrainer } from '../composables/useLalaRuTrainer.ts';
import { LALARU_TIMING } from '../mechanics/lalaru/timing.ts';
import type { ArrowSide, CardinalDirection, SelectedSide } from '../mechanics/lalaru/types.ts';

const trainer = useLalaRuTrainer();
const showCheatSheet = ref(true);

const cardinalLabels: Readonly<Record<CardinalDirection, string>> = {
  north: '北', east: '東', south: '南', west: '西'
};
const arrowSideLabels: Readonly<Record<ArrowSide, string>> = { left: '左', right: '右' };
const selectedSideLabels: Readonly<Record<SelectedSide, string>> = { left: '左', right: '右' };

function preventContextMenu(event: MouseEvent): void {
  event.preventDefault();
}

onMounted(() => document.addEventListener('contextmenu', preventContextMenu));
onBeforeUnmount(() => document.removeEventListener('contextmenu', preventContextMenu));
</script>

<template>
  <main class="lalaru-page">
    <div class="lalaru-heading">
      <div>
        <RouterLink class="back-link" to="/">← 回到迷宮一覽</RouterLink>
        <h1>拉拉魯｜旋轉角乘算</h1>
        <p>觀察頭頂旋轉提示與乘算 Icon，走進最終 90° 安全區。</p>
      </div>
      <span class="version-chip">FIRST MECHANIC · PREVIEW</span>
    </div>

    <nav class="mechanic-nav" aria-label="拉拉魯機制選擇">
      <RouterLink class="active" to="/aloalo-island/lalaru/rotation">旋轉角乘算</RouterLink>
      <RouterLink to="/aloalo-island/lalaru/composite-pattern">複合魔紋</RouterLink>
    </nav>

    <div class="lalaru-layout">
      <section class="panel lalaru-arena-panel">
        <LalaRuArena
          :phase="trainer.phase.value"
          :mode="trainer.mode.value"
          :player-position="trainer.playerPosition.value"
          :player-facing-angle="trainer.playerFacingAngle.value"
          :arrow-side="trainer.question.value.arrowSide"
          :multiplier="trainer.question.value.multiplier"
          :dot-count="trainer.dotCount.value"
          :animation-key="trainer.animationKey.value"
          :initial-safe-direction="trainer.question.value.initialSafeDirection"
          :final-safe-direction="trainer.solution.value.finalSafeDirection"
          :succeeded="trainer.succeeded.value"
          @start="trainer.start"
          @update-player-position="trainer.setPlayerPosition"
          @update-player-facing-angle="trainer.setPlayerFacingAngle"
        />
      </section>

      <aside class="panel lalaru-control-panel">
        <section>
          <p class="section-kicker">TRAINING MODE</p>
          <h2>練習設定</h2>
          <div class="mode-switch" role="group" aria-label="練習模式">
            <button
              type="button"
              :class="{ active: trainer.mode.value === 'tutorial' }"
              :disabled="trainer.phase.value === 'casting'"
              @click="trainer.setMode('tutorial')"
            >教學模式</button>
            <button
              type="button"
              :class="{ active: trainer.mode.value === 'battle' }"
              :disabled="trainer.phase.value === 'casting'"
              @click="trainer.setMode('battle')"
            >實戰模式</button>
          </div>
          <p class="mode-description">
            {{ trainer.mode.value === 'tutorial'
              ? '結算後顯示完整推導；結算前不會標出答案。'
              : '只保留實戰可觀察資訊；結算前不顯示方向答案。' }}
          </p>
          <button
            class="cheat-sheet-toggle"
            type="button"
            aria-controls="lalaru-cheat-sheet"
            :aria-expanded="showCheatSheet"
            @click="showCheatSheet = !showCheatSheet"
          >{{ showCheatSheet ? '隱藏乘算小抄' : '顯示乘算小抄' }}</button>
        </section>

        <LalaRuCheatSheet id="lalaru-cheat-sheet" v-show="showCheatSheet" />

        <section class="lalaru-status-card" aria-live="polite">
          <div class="status-heading">
            <span>{{ trainer.phase.value === 'idle' ? 'READY' : trainer.phase.value === 'casting' ? 'CASTING' : 'SETTLED' }}</span>
            <strong v-if="trainer.phase.value === 'casting'">判定倒數中</strong>
            <strong v-else-if="trainer.phase.value === 'resolved'" :class="trainer.succeeded.value ? 'success' : 'failure'">
              {{ trainer.succeeded.value ? '走位成功' : '受到攻擊' }}
            </strong>
            <strong v-else>等待開始</strong>
          </div>
          <div
            v-if="trainer.phase.value === 'casting' && trainer.mode.value === 'tutorial'"
            class="cast-progress"
            aria-hidden="true"
          >
            <span :key="trainer.animationKey.value" :style="{ '--resolve-duration': `${LALARU_TIMING.resolveMs}ms` }"></span>
          </div>
          <p v-if="trainer.phase.value === 'casting'">拖曳 YOU 移動。技能只會在最後一次結算。</p>
          <p v-else-if="trainer.phase.value === 'idle'">初始安全區會隨題目改變；角色可在場內自由拖曳。</p>
          <p v-else>本題已依結算瞬間的位置完成判定。</p>
        </section>

        <section
          v-if="trainer.phase.value === 'resolved' && trainer.mode.value === 'tutorial'"
          class="tutorial-breakdown"
        >
          <p class="section-kicker">ANSWER REVIEW</p>
          <h2>本題解法</h2>
          <p class="solution-chain">
            初始安全區：<strong class="initial-answer">{{ cardinalLabels[trainer.question.value.initialSafeDirection] }}</strong>
            <span>→</span>
            箭頭側：<strong>{{ arrowSideLabels[trainer.question.value.arrowSide] }}</strong>
            <span>→</span>
            <strong>{{ trainer.question.value.multiplier }}</strong>：{{ trainer.question.value.multiplier === 'III' ? '相反' : '相同' }}
            <span>→</span>
            選擇側：<strong>{{ selectedSideLabels[trainer.solution.value.selectedSide] }}</strong>
            <span>→</span>
            最終安全區：<strong class="final-answer">{{ cardinalLabels[trainer.solution.value.finalSafeDirection] }}</strong>
          </p>
          <div class="sector-legend">
            <span><i class="initial"></i>初始安全扇形</span>
            <span><i class="final"></i>最終安全扇形</span>
          </div>
        </section>

        <section class="lalaru-actions">
          <div class="score-line">
            <span>完成 {{ trainer.attempts.value }}</span>
            <span>成功 {{ trainer.successes.value }}</span>
          </div>
          <button
            v-if="trainer.phase.value === 'resolved'"
            class="secondary-button"
            type="button"
            @click="trainer.retry"
          >重新本題</button>
          <button
            v-if="trainer.phase.value === 'resolved'"
            class="primary-button"
            type="button"
            @click="trainer.nextQuestion"
          >下一題</button>
          <button
            v-if="trainer.phase.value === 'idle'"
            class="primary-button wide"
            type="button"
            @click="trainer.start"
          >開始</button>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.lalaru-page { display: flex; width: min(1440px, calc(100% - 40px)); height: calc(100dvh - 72px); max-height: calc(100dvh - 72px); margin: 0 auto; padding: 8px 0; flex-direction: column; overflow: hidden; user-select: none; -webkit-user-select: none; }
.lalaru-heading { display: flex; align-items: end; justify-content: space-between; flex: 0 0 auto; gap: 20px; margin-bottom: 6px; }
.lalaru-heading h1 { margin: 2px 0 0; font-size: var(--type-page-title); letter-spacing: -.025em; line-height: 1.15; }
.lalaru-heading > div > p:last-child { margin: 0; color: var(--text-helper); font-size: var(--type-body); line-height: var(--leading-compact); }
.back-link { display: inline-block; margin-bottom: 8px; color: #9ec5d2; font-size: 13px; text-decoration: none; }
.mechanic-nav { display: flex; flex: 0 0 auto; gap: 7px; margin: 0 0 7px; }
.mechanic-nav a { padding: 5px 10px; border: 1px solid var(--line-soft); border-radius: 999px; color: var(--text-secondary); background: #101c27; font-size: var(--type-secondary); text-decoration: none; }
.mechanic-nav a.active { border-color: #4dbbd3; color: #e8fbff; background: #173d49; }
.lalaru-layout { display: grid; min-height: 0; flex: 1 1 auto; grid-template-columns: minmax(0, 1.08fr) minmax(420px, .92fr); gap: 11px; align-items: stretch; overflow: hidden; }
.lalaru-arena-panel { display: grid; height: 100%; min-height: 0; min-width: 0; padding: 10px; overflow: hidden; place-items: center; container-type: size; }
.lalaru-control-panel { display: flex; height: 100%; min-width: 0; flex-direction: column; gap: 12px; padding: 12px; overflow-y: auto; scrollbar-width: none; }
.lalaru-control-panel::-webkit-scrollbar { display: none; }
.lalaru-control-panel section + section { padding-top: 13px; border-top: 1px solid var(--line-soft); }
.lalaru-control-panel h2 { margin: 0; font-size: 19px; }
.mode-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 10px; }
.mode-switch button { padding: 9px; border: 1px solid #3b5363; border-radius: 8px; color: #b9cad3; background: #101c27; cursor: pointer; }
.mode-switch button.active { border-color: #5ccbe2; color: #eafcff; background: #1a4655; }
.mode-description, .lalaru-status-card p { margin: 8px 0 0; color: var(--text-helper); font-size: 13px; line-height: 1.55; }
.cheat-sheet-toggle { width: 100%; margin-top: 10px; padding: 8px 10px; border: 1px solid #3b5363; border-radius: 8px; color: #c5d7df; background: #101c27; cursor: pointer; font-size: 12px; }
.cheat-sheet-toggle:hover { border-color: #5ccbe2; color: #effcff; background: #173442; }
.cheat-sheet-toggle:focus-visible { outline: 2px solid #68d7ed; outline-offset: 2px; }
.lalaru-status-card { padding: 13px !important; border: 1px solid #345165 !important; border-radius: 10px; background: linear-gradient(135deg, #142a39, #12222e); }
.status-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.status-heading span { color: #7ed9ec; font: 750 11px ui-monospace, monospace; letter-spacing: .15em; }
.status-heading strong { font-size: 14px; }
.success { color: #74e7aa; }
.failure { color: #ff7784; }
.cast-progress { height: 5px; margin-top: 10px; overflow: hidden; border-radius: 99px; background: #2b4453; }
.cast-progress span { display: block; width: 100%; height: 100%; background: linear-gradient(90deg, #50cde8, #f5c568); transform-origin: left; animation: cast-progress var(--resolve-duration) linear forwards; }
.solution-chain { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin: 10px 0; color: #bdcdd5; font-size: 14px; line-height: 1.8; }
.solution-chain strong { color: #fff; }
.solution-chain .initial-answer { color: #75d8ff; }
.solution-chain .final-answer { color: #72e9ad; }
.sector-legend { display: flex; flex-wrap: wrap; gap: 13px; color: var(--text-helper); font-size: 12px; }
.sector-legend span { display: inline-flex; align-items: center; gap: 6px; }
.sector-legend i { width: 12px; height: 12px; border-radius: 3px; }
.sector-legend i.initial { border: 1px solid #6ed7ff; background: rgba(79, 176, 226, .4); }
.sector-legend i.final { border: 1px solid #70ecad; background: rgba(76, 220, 143, .4); }
.lalaru-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.score-line { display: flex; grid-column: 1 / -1; justify-content: space-between; color: var(--text-helper); font: 12px ui-monospace, monospace; }
.lalaru-actions button { padding: 10px; }
.lalaru-actions .wide { grid-column: 1 / -1; }
@keyframes cast-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@media (max-width: 860px) {
  .lalaru-page { display: block; height: auto; min-height: calc(100dvh - 72px); padding: 18px 0 32px; overflow: visible; }
  .lalaru-layout { grid-template-columns: 1fr; }
  .lalaru-heading { align-items: start; }
  .lalaru-arena-panel { height: auto; container-type: normal; }
  .lalaru-control-panel { height: auto; overflow: visible; }
}
@media (max-width: 520px) {
  .lalaru-page { width: calc(100% - 20px); padding-top: 14px; }
  .lalaru-heading .version-chip { display: none; }
  .mechanic-nav { overflow-x: auto; }
  .mechanic-nav a { flex: 0 0 auto; }
  .lalaru-arena-panel { padding: 7px; }
}
</style>
