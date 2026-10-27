<script setup lang="ts">
import { ref } from 'vue';
import { MECHANIC_ICONS } from '../../assets/mechanic-icons.ts';

type LalaRuCheatSheetView = 'boss' | 'player';

const props = withDefaults(defineProps<{
  defaultView?: LalaRuCheatSheetView;
  defaultOpen?: boolean;
}>(), {
  defaultView: 'boss',
  defaultOpen: false
});

const activeView = ref<LalaRuCheatSheetView>(props.defaultView);
const bossRules = [
  {
    multiplier: 'V',
    icon: MECHANIC_ICONS.multiplyV,
    lead: '我是 5 Buff',
    keyword: '有',
    cases: [
      { arrow: 'left', safe: 'left' },
      { arrow: 'right', safe: 'right' }
    ]
  },
  {
    multiplier: 'III',
    icon: MECHANIC_ICONS.multiplyIII,
    lead: '我是 3 Buff',
    keyword: '沒',
    cases: [
      { arrow: 'left', safe: 'right' },
      { arrow: 'right', safe: 'left' }
    ]
  }
] as const;

const playerRules = [
  {
    multiplier: 'V',
    icon: MECHANIC_ICONS.multiplyV,
    lead: '我是 5 Buff',
    keyword: '沒',
    cases: [
      { arrow: 'left', facing: 'right' },
      { arrow: 'right', facing: 'left' }
    ]
  },
  {
    multiplier: 'III',
    icon: MECHANIC_ICONS.multiplyIII,
    lead: '我是 3 Buff',
    keyword: '有',
    cases: [
      { arrow: 'left', facing: 'left' },
      { arrow: 'right', facing: 'right' }
    ]
  }
] as const;
</script>

<template>
  <details class="cheat-sheet" :open="defaultOpen">
    <summary>
      <span><small>QUICK REFERENCE</small><strong>乘算小抄</strong></span>
      <b>{{ activeView === 'boss' ? '王・三沒五有' : '玩家・三有五沒' }}</b>
    </summary>

    <div class="view-switch" role="group" aria-label="乘算小抄檢視">
      <button
        type="button"
        :class="{ active: activeView === 'boss' }"
        :aria-pressed="activeView === 'boss'"
        @click="activeView = 'boss'"
      >王</button>
      <button
        type="button"
        :class="{ active: activeView === 'player' }"
        :aria-pressed="activeView === 'player'"
        @click="activeView = 'player'"
      >玩家</button>
    </div>

    <div class="cheat-sheet-heading">
      <div>
        <h2>{{ activeView === 'boss' ? '王的乘算安全區' : '玩家的預先面向' }}</h2>
        <p>{{ activeView === 'boss'
          ? '從王的 Buff 與箭頭，判斷魔紋炮旋轉後的安全側。'
          : '先決定旋轉後要讓缺口或前進方向朝哪裡，再反推旋轉前面向。' }}</p>
      </div>
      <span>{{ activeView === 'boss' ? '三沒五有' : '三有五沒' }}</span>
    </div>

    <div v-if="activeView === 'boss'" class="rule-grid">
      <article v-for="rule in bossRules" :key="rule.multiplier" class="rule-column">
        <div class="rule-copy">
          <img :src="rule.icon" :alt="`${rule.multiplier} 乘算圖示`">
          <p><strong>{{ rule.lead }}</strong><br>看<strong class="rule-keyword">{{ rule.keyword }}</strong>箭頭那邊</p>
        </div>

        <div class="rule-examples" aria-hidden="true">
          <svg
            v-for="example in rule.cases"
            :key="example.arrow"
            class="rule-diagram"
            viewBox="0 0 100 82"
          >
            <circle class="cue-disc" cx="50" cy="43" r="27" />
            <path class="cue-triangle" d="M 50 4 L 42 17 L 58 17 Z" />
            <path
              v-if="example.arrow === 'left'"
              class="cue-arrow left"
              d="M 33 69 L 20 56 L 20 34 M 20 34 L 10 45 M 20 34 L 30 45"
            />
            <path
              v-else
              class="cue-arrow right"
              d="M 67 69 L 80 56 L 80 34 M 80 34 L 70 45 M 80 34 L 90 45"
            />
            <circle
              class="safe-mark"
              :cx="example.safe === 'left' ? 20 : 80"
              cy="48"
              r="17"
            />
          </svg>
        </div>
      </article>
    </div>

    <div v-else class="rule-grid player-rules">
      <article v-for="rule in playerRules" :key="rule.multiplier" class="rule-column">
        <div class="rule-copy">
          <img :src="rule.icon" :alt="`${rule.multiplier} 乘算圖示`">
          <p><strong>{{ rule.lead }}</strong><br>旋轉前面向<strong class="rule-keyword">{{ rule.keyword }}</strong>箭頭側</p>
        </div>

        <div class="rule-examples" aria-hidden="true">
          <svg
            v-for="example in rule.cases"
            :key="example.arrow"
            class="rule-diagram"
            viewBox="0 0 100 82"
          >
            <circle class="cue-disc" cx="50" cy="43" r="27" />
            <path class="cue-triangle" d="M 50 4 L 42 17 L 58 17 Z" />
            <path
              v-if="example.arrow === 'left'"
              class="cue-arrow left"
              d="M 33 69 L 20 56 L 20 34 M 20 34 L 10 45 M 20 34 L 30 45"
            />
            <path
              v-else
              class="cue-arrow right"
              d="M 67 69 L 80 56 L 80 34 M 80 34 L 70 45 M 80 34 L 90 45"
            />
            <path
              class="facing-mark"
              :class="example.facing"
              :d="example.facing === 'left' ? 'M 50 43 L 19 43 M 19 43 L 29 35 M 19 43 L 29 51' : 'M 50 43 L 81 43 M 81 43 L 71 35 M 81 43 L 71 51'"
            />
          </svg>
        </div>
      </article>
    </div>

    <p class="viewpoint-note">
      {{ activeView === 'boss'
        ? '紅圈標示旋轉後的安全側；先把初始安全缺口想成在自己腳下。'
        : '白箭頭標示旋轉前的角色面向；乘算仍使用同一套旋轉規則。' }}
    </p>
  </details>
</template>

<style scoped>
.cheat-sheet { border: 1px solid var(--line-soft); border-radius: 10px; background: rgba(8, 17, 24, .3); }
.cheat-sheet.embedded-cheat-sheet { margin-top: var(--space-section); }
.cheat-sheet summary { display: flex; min-height: 42px; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; cursor: pointer; list-style: none; }
.cheat-sheet summary::-webkit-details-marker { display: none; }
.cheat-sheet summary::after { content: '＋'; color: var(--text-helper); font-weight: 800; }
.cheat-sheet[open] summary::after { content: '－'; }
.cheat-sheet summary > span { display: grid; gap: 1px; }
.cheat-sheet summary small { color: var(--text-helper); font: 750 9px ui-monospace, monospace; letter-spacing: .12em; }
.cheat-sheet summary strong { color: #f2f8fb; font-size: 14px; }
.cheat-sheet summary b { margin-left: auto; color: #f5c568; font: 750 11px ui-monospace, monospace; letter-spacing: .05em; }
.view-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin: 0 10px 10px; padding: 3px; border-radius: 8px; background: #09141c; }
.view-switch button { padding: 6px 8px; border: 1px solid transparent; border-radius: 6px; color: var(--text-helper); background: transparent; font: inherit; font-size: 12px; font-weight: 750; cursor: pointer; }
.view-switch button.active { border-color: #4cb3ce; color: #dffaff; background: #173947; }
.cheat-sheet-heading { display: flex; align-items: end; justify-content: space-between; gap: 12px; }
.cheat-sheet-heading h2 { margin: 0; font-size: 19px; }
.cheat-sheet-heading { margin: 0 10px; }
.cheat-sheet-heading p { margin: 3px 0 0; color: var(--text-helper); font-size: 11px; line-height: 1.45; }
.cheat-sheet-heading > span { color: #f5c568; font: 750 12px ui-monospace, monospace; letter-spacing: .08em; }
.rule-copy strong.rule-keyword { color: #ff4f58; font-weight: 900; }
.rule-grid { display: grid; grid-template-columns: 1fr 1fr; margin: 10px 10px 0; overflow: hidden; border: 1px solid #344d5e; border-radius: 10px; background: rgba(8, 17, 24, .58); }
.rule-column { min-width: 0; padding: 10px 8px 8px; }
.rule-column + .rule-column { border-left: 1px solid #48606c; }
.rule-copy { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; }
.rule-copy img { width: 28px; height: 37px; object-fit: contain; image-rendering: auto; }
.rule-copy p { margin: 0; color: #d5e2e7; font-size: 11px; line-height: 1.4; }
.rule-copy strong { color: #fff; font-size: 12px; }
.rule-examples { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-top: 7px; }
.rule-diagram { display: block; width: 100%; overflow: visible; }
.cue-disc { fill: #070b0d; stroke: #e8922e; stroke-width: 3; }
.cue-triangle { fill: #e98925; }
.cue-arrow { fill: none; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.cue-arrow.left { stroke: #e44732; }
.cue-arrow.right { stroke: #35a9ff; }
.safe-mark { fill: none; stroke: #ff4b55; stroke-width: 4; }
.facing-mark { fill: none; stroke: #f4f8fa; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
.viewpoint-note { margin: 8px 11px 10px; color: var(--text-helper); font-size: 11px; line-height: 1.5; }

@media (max-width: 390px) {
  .rule-grid { grid-template-columns: 1fr; }
  .rule-column + .rule-column { border-top: 1px solid #48606c; border-left: 0; }
  .rule-diagram { max-height: 76px; }
}
</style>
