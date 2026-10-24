<script setup lang="ts">
import { MECHANIC_ICONS } from '../../assets/mechanic-icons.ts';

const rules = [
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
</script>

<template>
  <section class="cheat-sheet" aria-labelledby="lalaru-cheat-sheet-title">
    <div class="cheat-sheet-heading">
      <div>
        <p class="section-kicker">QUICK REFERENCE</p>
        <h2 id="lalaru-cheat-sheet-title">乘算小抄</h2>
      </div>
      <span>三沒五有</span>
    </div>

    <div class="rule-grid">
      <article v-for="rule in rules" :key="rule.multiplier" class="rule-column">
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

    <p class="viewpoint-note">先把初始安全缺口想成在自己腳下，再看左右。</p>
  </section>
</template>

<style scoped>
.cheat-sheet { padding-top: 13px; border-top: 1px solid var(--line-soft); }
.cheat-sheet-heading { display: flex; align-items: end; justify-content: space-between; gap: 12px; }
.cheat-sheet-heading h2 { margin: 0; font-size: 19px; }
.cheat-sheet-heading > span { color: #f5c568; font: 750 12px ui-monospace, monospace; letter-spacing: .08em; }
.rule-copy strong.rule-keyword { color: #ff4f58; font-weight: 900; }
.rule-grid { display: grid; grid-template-columns: 1fr 1fr; margin-top: 10px; overflow: hidden; border: 1px solid #344d5e; border-radius: 10px; background: rgba(8, 17, 24, .58); }
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
.viewpoint-note { margin: 8px 1px 0; color: var(--text-helper); font-size: 11px; line-height: 1.5; }

@media (max-width: 390px) {
  .rule-grid { grid-template-columns: 1fr; }
  .rule-column + .rule-column { border-top: 1px solid #48606c; border-left: 0; }
  .rule-diagram { max-height: 76px; }
}
</style>
