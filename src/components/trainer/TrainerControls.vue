<script setup lang="ts">
import { ROLES, type Role } from '../../domain/roles.ts';
import type { KetudukeQuestion } from '../../mechanics/ketuduke/types.ts';
import type {
  MahjongRunHint,
  TrainerSettings
} from '../../composables/useKetudukeTrainer.ts';
import MechanicIcon from './MechanicIcon.vue';
import TrainerPracticeSettings from './TrainerPracticeSettings.vue';

defineProps<{
  focus: Role | null;
  ready: boolean;
  question: KetudukeQuestion;
  settings: TrainerSettings;
  hintVisible: boolean;
  roleLocked: boolean;
  mechanicRevealed: boolean;
  mahjongRunHint: MahjongRunHint | null;
  showArenaMarkers: boolean;
}>();

defineEmits<{
  selectRole: [role: Role | null];
  newQuestion: [];
  toggleHint: [];
  'update:timed': [value: boolean];
  'update:showWind': [value: boolean];
  'update:showArenaMarkers': [value: boolean];
}>();
</script>

<template>
  <TrainerPracticeSettings class="control-section" title-id="settings-title">
    <template #action>
      <button class="icon-button" type="button" title="產生新題目" @click="$emit('newQuestion')">↻</button>
    </template>

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
          <small>每輪移動 1 秒＋停留 0.5 秒</small>
        </span>
      </label>
      <label class="switch-row">
        <input
          type="checkbox"
          :checked="showArenaMarkers"
          @change="$emit('update:showArenaMarkers', ($event.target as HTMLInputElement).checked)"
        >
        <span>
          <strong>場地標記</strong>
          <small>顯示 A～D、1～4</small>
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
        :disabled="roleLocked"
        @click="$emit('selectRole', role)"
      >
        <strong>{{ role }}</strong>
        <span v-if="ready" class="role-buff" :class="question.buffs[role]">
          <MechanicIcon :name="question.buffs[role]" />
          {{ question.buffs[role] === 'bubble' ? '泡泡' : '止步' }}
        </span>
        <span v-else class="role-buff pending">待揭示</span>
        <MechanicIcon
          v-if="mechanicRevealed && (question.party === '分散' || question.buffs[role] === 'bubble')"
          class="role-mechanic-icon"
          :name="question.party === '分散' ? 'spread' : 'stack'"
          :alt="question.party"
        />
      </button>
    </div>

    <div v-if="mechanicRevealed" class="mechanic-reveal" :class="question.party === '分攤' ? 'stack' : 'spread'">
      <MechanicIcon
        :name="question.party === '分攤' ? 'stack' : 'spread'"
        :alt="question.party"
      />
      <strong>{{ question.party === '分攤' ? '水瀑・分攤' : '水化彈・分散' }}</strong>
    </div>

    <div v-if="mahjongRunHint" class="mahjong-run-hint" aria-live="polite">
      <span class="mahjong-run-label">①／② 麻跑法</span>
      <div class="mahjong-run-routes">
        <template v-for="(route, index) in mahjongRunHint.routes" :key="route.group">
          <span v-if="index" class="mahjong-run-separator" aria-hidden="true">｜</span>
          <span class="mahjong-run-route">
            <strong>{{ route.group }}</strong><span aria-hidden="true">→</span>
            <b class="mahjong-run-destination" :class="`region-${route.region}`">
              {{ route.region === 1 ? '① 麻' : '② 麻' }}
            </b>
          </span>
        </template>
      </div>
    </div>

    <button class="secondary-button hint-button" type="button" @click="$emit('toggleHint')">
      {{ hintVisible ? '收起排隊法提示' : '查看排隊法提示' }}
    </button>
    <div v-if="hintVisible" class="hint-card">
      <strong>排隊法口訣</strong>
      <p>橫水晶排直行，直水晶排橫列；止步站兩側，泡泡站中間。</p>
      <p>麻將揭示後依①、②方向移動一格，再確認吹風前站位。</p>
    </div>
  </TrainerPracticeSettings>
</template>
