<script setup lang="ts">
import { ROLES, type Role } from '../../domain/roles.ts';
import type { KetudukeQuestion } from '../../mechanics/ketuduke/types.ts';
import type { TrainerSettings } from '../../composables/useKetudukeTrainer.ts';
import MechanicIcon from './MechanicIcon.vue';

defineProps<{
  focus: Role | null;
  ready: boolean;
  question: KetudukeQuestion;
  settings: TrainerSettings;
  hintVisible: boolean;
}>();

defineEmits<{
  selectRole: [role: Role | null];
  newQuestion: [];
  toggleHint: [];
  'update:timed': [value: boolean];
  'update:showWind': [value: boolean];
}>();
</script>

<template>
  <section class="control-section" aria-labelledby="settings-title">
    <div class="control-section-heading">
      <div>
        <p class="section-kicker">PRACTICE SETTINGS</p>
        <h2 id="settings-title">練習設定</h2>
      </div>
      <button class="icon-button" type="button" title="產生新題目" @click="$emit('newQuestion')">↻</button>
    </div>

    <div class="setting-row">
      <label class="switch-row">
        <input
          type="checkbox"
          :checked="settings.timed"
          @change="$emit('update:timed', ($event.target as HTMLInputElement).checked)"
        >
        <span>
          <strong>實戰模式</strong>
          <small>5 秒排隊＋5 秒站位</small>
        </span>
      </label>
      <label class="switch-row">
        <input
          type="checkbox"
          :checked="settings.showWind"
          @change="$emit('update:showWind', ($event.target as HTMLInputElement).checked)"
        >
        <span>
          <strong>吹風位移動畫</strong>
          <small>本階段僅保留設定介面</small>
        </span>
      </label>
    </div>

    <div class="role-heading">
      <span>選擇練習角色</span>
      <small>作答時只顯示自己</small>
    </div>
    <div class="role-grid">
      <button
        v-for="role in ROLES"
        :key="role"
        class="role-card"
        :class="{ selected: focus === role }"
        type="button"
        :aria-pressed="focus === role"
        @click="$emit('selectRole', role)"
      >
        <strong>{{ role }}</strong>
        <span v-if="ready" class="role-buff" :class="question.buffs[role]">
          <MechanicIcon :name="question.buffs[role]" />
          {{ question.buffs[role] === 'bubble' ? '泡泡' : '止步' }}
        </span>
        <span v-else class="role-buff pending">待揭示</span>
        <MechanicIcon
          v-if="ready && (question.party === '分散' || question.buffs[role] === 'bubble')"
          class="role-mechanic-icon"
          :name="question.party === '分散' ? 'spread' : 'stack'"
          :alt="question.party"
        />
      </button>
    </div>

    <div v-if="ready" class="mechanic-reveal" :class="question.party === '分攤' ? 'stack' : 'spread'">
      <MechanicIcon
        :name="question.party === '分攤' ? 'stack' : 'spread'"
        :alt="question.party"
      />
      <strong>{{ question.party === '分攤' ? '水瀑・分攤' : '水化彈・分散' }}</strong>
    </div>

    <button class="secondary-button hint-button" type="button" @click="$emit('toggleHint')">
      {{ hintVisible ? '收起排隊法提示' : '查看排隊法提示' }}
    </button>
    <div v-if="hintVisible" class="hint-card">
      <strong>排隊法口訣</strong>
      <p>橫水晶排直列，直水晶排橫列；止步站兩側，泡泡站中間。</p>
      <p>此處僅呈現 V4.5 已有說明，互動判定尚未接入。</p>
    </div>
  </section>
</template>
