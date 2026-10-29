<script setup lang="ts">
import { computed, ref } from 'vue';
import { MECHANIC_ICONS } from '../../assets/mechanic-icons.ts';
import TrainerQuickReference from '../trainer/TrainerQuickReference.vue';

type LalaRuCheatSheetView = 'boss' | 'player';

const props = withDefaults(defineProps<{
  defaultView?: LalaRuCheatSheetView;
  defaultOpen?: boolean;
  availableViews?: readonly LalaRuCheatSheetView[];
}>(), {
  defaultView: 'boss',
  defaultOpen: false,
  availableViews: () => ['boss', 'player']
});

const activeView = ref<LalaRuCheatSheetView>(
  props.availableViews.includes(props.defaultView) ? props.defaultView : props.availableViews[0] ?? 'boss'
);
const showViewSwitch = computed(() => props.availableViews.length > 1);
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
    keyword: '有',
    cases: [
      { arrow: 'left', gap: 'left' },
      { arrow: 'right', gap: 'right' }
    ]
  },
  {
    multiplier: 'III',
    icon: MECHANIC_ICONS.multiplyIII,
    lead: '我是 3 Buff',
    keyword: '沒',
    cases: [
      { arrow: 'left', gap: 'right' },
      { arrow: 'right', gap: 'left' }
    ]
  }
] as const;
</script>

<template>
  <TrainerQuickReference class="cheat-sheet" title="乘算小抄" :default-open="defaultOpen">
      <div v-if="showViewSwitch" class="view-switch" role="group" aria-label="乘算小抄檢視">
        <button
          v-if="availableViews.includes('boss')"
          type="button"
          :class="{ active: activeView === 'boss' }"
          :aria-pressed="activeView === 'boss'"
          @click="activeView = 'boss'"
        >王的安全區</button>
        <button
          v-if="availableViews.includes('player')"
          type="button"
          :class="{ active: activeView === 'player' }"
          :aria-pressed="activeView === 'player'"
          @click="activeView = 'player'"
        >玩家旋轉前缺口</button>
      </div>

      <div class="cheat-sheet-heading">
        <h2>{{ activeView === 'boss' ? '王的乘算安全區｜三沒五有' : '旋轉前缺口｜三沒五有' }}</h2>
        <p>{{ activeView === 'boss'
          ? '從王的 Buff 與箭頭，判斷魔紋炮旋轉後的安全側。'
          : '以 BOSS 在正前方為基準，先決定旋轉前缺口；角色面向仍須配合 Analysis Debuff。' }}</p>
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
            <p><strong>{{ rule.lead }}</strong><br>旋轉前缺口放在<strong class="rule-keyword">{{ rule.keyword }}</strong>箭頭側</p>
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
                class="gap-mark"
                :cx="example.gap === 'left' ? 20 : 80"
                cy="48"
                r="17"
              />
            </svg>
          </div>
        </article>
      </div>

      <p class="viewpoint-note">
        {{ activeView === 'boss'
          ? '紅圈標示旋轉後的安全側；先把初始安全缺口想成在自己腳下。'
          : '紅圈標示旋轉前缺口；分析機制需再依 Debuff 換算角色面向，平面爆雷則反推旋轉前前進方向。' }}
      </p>
  </TrainerQuickReference>
</template>

<style scoped>
.view-switch { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px; padding: 3px; border: 1px solid var(--control-border); border-radius: var(--radius-control); background: var(--surface-inset); }
.view-switch button { appearance: none; min-width: 0; min-height: 34px; padding: 6px 8px; border: 1px solid transparent; border-radius: calc(var(--radius-control) - 3px); color: var(--text-helper); background: transparent; font: inherit; font-size: var(--type-small); font-weight: 750; line-height: 1.2; text-align: center; cursor: pointer; transition: border-color .14s ease, color .14s ease, background .14s ease, transform .08s ease; }
.view-switch button:hover { border-color: var(--control-border); color: var(--text); background: var(--control-bg); }
.view-switch button:focus-visible { outline: 2px solid var(--control-border-selected); outline-offset: 2px; }
.view-switch button:active { transform: translateY(1px); }
.view-switch button.active { border-color: var(--control-border-selected); color: var(--text); background: var(--control-bg-selected); box-shadow: inset 0 0 0 1px rgba(155, 236, 250, .16); }
.cheat-sheet-heading { display: grid; gap: 5px; min-width: 0; }
.cheat-sheet-heading h2 { margin: 0; color: var(--text); font-size: 15px; line-height: 1.35; }
.cheat-sheet-heading p { margin: 0; color: var(--text-helper); font-size: 11px; line-height: 1.5; }
.rule-copy strong.rule-keyword { color: #ff4f58; font-weight: 900; }
.rule-grid { display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; border: 1px solid var(--control-border); border-radius: 10px; background: rgba(8, 17, 24, .58); }
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
.gap-mark { fill: none; stroke: #ff4b55; stroke-width: 4; }
.viewpoint-note { margin: 0 1px; color: var(--text-helper); font-size: 11px; line-height: 1.5; }

@media (max-width: 390px) {
  .view-switch button { padding-inline: 5px; font-size: 11px; }
  .rule-grid { grid-template-columns: 1fr; }
  .rule-column + .rule-column { border-top: 1px solid #48606c; border-left: 0; }
  .rule-diagram { max-height: 76px; }
}
</style>
