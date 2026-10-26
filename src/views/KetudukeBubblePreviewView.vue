<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import BubbleArena from '../components/trainer/BubbleArena.vue';
import MechanicIcon from '../components/trainer/MechanicIcon.vue';
import { useBubblePreview, type BubbleConfigurationMode } from '../composables/useBubblePreview.ts';
import { useArenaMarkers } from '../composables/useArenaMarkers.ts';
import { ROLES, type Role } from '../domain/roles.ts';
import {
  BUBBLE_MAX_SPEED_TILES_PER_SECOND,
  BUBBLE_MIN_SPEED_TILES_PER_SECOND
} from '../mechanics/ketuduke/bubbles.ts';
import {
  BUBBLES_MOVE_AT_SECONDS,
  BUBBLES_SPAWN_AT_SECONDS,
  FIRST_HYDRATION_CAST_END_AT_SECONDS,
  FIRST_HYDRATION_CAST_START_AT_SECONDS,
  FIRST_MECHANIC_RESOLVE_AT_SECONDS,
  GROUND_AOE_SCHEDULES,
  SECOND_DEBUFF_APPEAR_AT_SECONDS,
  SECOND_HYDRATION_CAST_END_AT_SECONDS,
  SECOND_HYDRATION_CAST_START_AT_SECONDS,
  SECOND_MECHANIC_RESOLVE_AT_SECONDS,
  type MechanicKind,
  type MechanicOrder
} from '../mechanics/ketuduke/bubble-timeline.ts';
import { BUBBLE_PARTY_ROLE_LABELS } from '../mechanics/ketuduke/bubble-party.ts';

const preview = useBubblePreview();
const arenaMarkers = useArenaMarkers();
const showTrajectories = ref(false);
const hoveredDebuffKind = ref<MechanicKind | null>(null);
const configurationModes: readonly BubbleConfigurationMode[] = ['random', 'A', 'B'];
const mechanicOrderOptions: readonly MechanicOrder[] = ['stack-first', 'spread-first'];
const displayedMechanicOrderOptions = computed<readonly MechanicOrder[]>(() => (
  preview.forcedCorrectOrder.value
    ? [preview.forcedCorrectOrder.value]
    : mechanicOrderOptions
));

const timelineMilestones = [
  { at: SECOND_DEBUFF_APPEAR_AT_SECONDS, label: '第二個 Debuff 出現' },
  { at: BUBBLES_SPAWN_AT_SECONDS, label: '泡泡生成＋第一次水化爆彈詠唱' },
  { at: BUBBLES_MOVE_AT_SECONDS, label: '第一次詠唱結束＋泡泡起步' },
  ...GROUND_AOE_SCHEDULES.flatMap(schedule => [
    {
      at: schedule.spawnAtSeconds,
      label: `第 ${schedule.cycle} 次・第 ${schedule.round} 輪黃圈`
    },
    {
      at: schedule.explodeAtSeconds,
      label: `第 ${schedule.cycle} 次・第 ${schedule.round} 輪爆炸`
    }
  ]),
  { at: FIRST_MECHANIC_RESOLVE_AT_SECONDS, label: '第一次分攤／分散判定' },
  { at: SECOND_HYDRATION_CAST_START_AT_SECONDS, label: '第二次水化爆彈詠唱' },
  { at: SECOND_HYDRATION_CAST_END_AT_SECONDS, label: '第二次水化爆彈詠唱結束' },
  { at: SECOND_MECHANIC_RESOLVE_AT_SECONDS, label: '第二次分攤／分散判定' }
].sort((left, right) => left.at - right.at);

const nextMechanicEvent = computed(() => {
  const elapsed = preview.encounterElapsedSeconds.value;
  return timelineMilestones.find(milestone => elapsed < milestone.at)?.label ?? '時間軸完成';
});

const hydrationCastStatus = computed(() => {
  const elapsed = preview.encounterElapsedSeconds.value;
  if (elapsed < FIRST_HYDRATION_CAST_START_AT_SECONDS) return '尚未開始';
  if (elapsed < FIRST_HYDRATION_CAST_END_AT_SECONDS) {
    return `第一次詠唱 ${(FIRST_HYDRATION_CAST_END_AT_SECONDS - elapsed).toFixed(1)}s`;
  }
  if (elapsed < SECOND_HYDRATION_CAST_START_AT_SECONDS) return '第一次詠唱完成';
  if (elapsed < SECOND_HYDRATION_CAST_END_AT_SECONDS) {
    return `第二次詠唱 ${(SECOND_HYDRATION_CAST_END_AT_SECONDS - elapsed).toFixed(1)}s`;
  }
  return '第二次詠唱完成';
});

const bubbleStatus = computed(() => {
  const elapsed = preview.encounterElapsedSeconds.value;
  if (!preview.bubblesSpawned.value) {
    return `${Math.max(0, BUBBLES_SPAWN_AT_SECONDS - elapsed).toFixed(1)}s 後生成`;
  }
  if (preview.waitingToMove.value) {
    return `場邊待機 ${preview.startDelayRemainingSeconds.value.toFixed(1)}s`;
  }
  return '固定直線移動';
});

function debuffTooltip(kind: MechanicKind): string {
  return kind === 'stack'
    ? '水瀑：效果時間結束時以攜帶者為中心發動可分攤的圓形 AOE（單吃 30 萬）'
    : '水化彈：效果時間結束時以攜帶者為中心發動圓形 AOE';
}

function orderLabel(order: MechanicOrder): string {
  return order === 'stack-first' ? '先分攤' : '先分散';
}

function partyRoleLabel(role: Role): string {
  return BUBBLE_PARTY_ROLE_LABELS[role];
}
</script>

<template>
  <main class="trainer-page">
    <div class="trainer-heading">
      <div>
        <RouterLink class="back-link" to="/aloalo-island/ketuduke">← 返回排隊法練習</RouterLink>
        <h1>凱圖嘟凱・吹氣泡練習</h1>
        <p>第二機制｜Debuff 判讀、泡泡、黃圈與完整時間軸</p>
      </div>
      <span class="version-chip">BUBBLE TIMELINE · CONFIG {{ preview.configuration.value.id }}</span>
    </div>

    <nav class="mechanic-nav" aria-label="凱圖嘟凱機制切換">
      <RouterLink to="/aloalo-island/ketuduke">第一機制：排隊法</RouterLink>
      <RouterLink class="active" to="/aloalo-island/ketuduke/blowing-bubbles">第二機制：吹氣泡</RouterLink>
    </nav>

    <div class="trainer-layout bubble-preview-layout">
      <section class="arena-panel panel bubble-preview-panel" aria-label="凱圖嘟凱吹氣泡四乘四場地">
        <div class="bubble-practice-shell">
          <section class="arena-debuff-panel" aria-label="分攤分散 Debuff 判讀">
            <div class="arena-debuff-icons">
              <article
                v-for="debuff in preview.visibleDebuffs.value"
                :key="debuff.slot"
                class="arena-debuff-icon"
                :class="debuff.kind"
                :aria-label="debuffTooltip(debuff.kind)"
                tabindex="0"
                @mouseenter="hoveredDebuffKind = debuff.kind"
                @mouseleave="hoveredDebuffKind = null"
                @focus="hoveredDebuffKind = debuff.kind"
                @blur="hoveredDebuffKind = null"
              >
                <MechanicIcon
                  :name="debuff.kind"
                  alt=""
                />
                <strong>{{ debuff.remainingSeconds.toFixed(1) }}s</strong>
              </article>
            </div>

            <div class="arena-order-check">
              <div
                class="mechanic-order-buttons arena-order-buttons"
                :class="{ 'forced-answer': preview.forcedCorrectOrder.value !== null }"
              >
                <button
                  v-for="order in displayedMechanicOrderOptions"
                  :key="order"
                  type="button"
                  :disabled="preview.selectedMechanicOrder.value !== null || preview.orderPenaltyActive.value"
                  :class="{ selected: preview.selectedMechanicOrder.value === order }"
                  @click="preview.chooseMechanicOrder(order)"
                >
                  {{ preview.forcedCorrectOrder.value ? `${orderLabel(order)}啦!😡` : orderLabel(order) }}
                </button>
              </div>
              <p v-if="hoveredDebuffKind" class="arena-debuff-description" role="tooltip">
                {{ debuffTooltip(hoveredDebuffKind) }}
              </p>
              <p v-else-if="preview.orderFeedback.value === 'incorrect'" class="order-feedback incorrect">
                {{ preview.incorrectOrderAttempts.value >= 2 ? '你要確欸!🤨🤨🤨' : '你確定?🤨' }}
              </p>
              <p v-else-if="preview.orderFeedback.value === 'correct'" class="order-feedback correct">
                你很棒🤗
              </p>
              <p v-else class="arena-order-hint">依 Debuff 倒數判斷先後</p>
            </div>
          </section>

          <div class="bubble-arena-stage">
            <BubbleArena
              :bubbles="preview.bubbles.value"
              :paths="preview.configuration.value.bubbles"
              :show-trajectories="showTrajectories"
              :player-position="preview.playerPosition.value"
              :player-role-label="partyRoleLabel(preview.playerRole.value)"
              :npc-members="preview.npcMembers.value"
              :player-disabled="preview.dead.value"
              :death-cause="preview.deathCause.value"
              :captured-bubble-id="preview.capturedBubbleId.value"
              :captured-role="preview.capturedRole.value"
              :mechanic-elapsed-seconds="preview.encounterElapsedSeconds.value"
              :ground-aoes="preview.groundAoes.value"
              :spread-preview="preview.spreadPreview.value"
              :stack-preview="preview.stackPreview.value"
              @update-player-position="preview.setPlayerPosition"
              @player-drag-start="preview.setPlayerDragging(true)"
              @player-drag-end="preview.setPlayerDragging(false)"
            />
          </div>
        </div>
      </section>

      <aside class="control-panel panel bubble-controls">
        <section class="control-section">
          <div class="control-section-heading">
            <div>
              <p class="section-kicker">MECHANIC CONTROLS</p>
              <h2>吹氣泡時間軸</h2>
            </div>
            <span class="configuration-badge">配置 {{ preview.configuration.value.id }}</span>
          </div>

          <fieldset class="bubble-role-picker">
            <legend>操作角色</legend>
            <button
              v-for="role in ROLES"
              :key="role"
              type="button"
              :class="{ active: preview.playerRole.value === role }"
              :aria-pressed="preview.playerRole.value === role"
              :disabled="preview.dead.value"
              @click="preview.selectPlayerRole(role)"
            >
              {{ partyRoleLabel(role) }}
            </button>
            <small>T／D1 左半場・H／D2 右半場</small>
          </fieldset>

          <div class="bubble-action-row">
            <button class="primary-button" type="button" @click="preview.togglePlayback">
              {{ preview.dead.value ? '↻ 死亡後重新開始' : preview.finished.value ? '▶ 重新播放' : preview.playing.value ? '⏸ 暫停' : '▶ 繼續' }}
            </button>
            <button class="secondary-button" type="button" @click="preview.restart">
              {{ preview.configurationMode.value === 'random' ? '↻ 重播並重新抽配置' : `↻ 重播配置 ${preview.configurationMode.value}` }}
            </button>
          </div>

          <div class="bubble-timeline-status">
            <div class="timeline-clock">
              <span>完整時間軸</span>
              <strong>T+{{ preview.encounterElapsedSeconds.value.toFixed(1) }}s</strong>
              <small>下一事件：{{ nextMechanicEvent }}</small>
            </div>
            <div class="timeline-countdowns">
              <div>
                <span>第一次判定</span>
                <strong>{{ Math.max(0, FIRST_MECHANIC_RESOLVE_AT_SECONDS - preview.encounterElapsedSeconds.value).toFixed(1) }}s</strong>
              </div>
              <div>
                <span>水化爆彈</span>
                <strong>{{ hydrationCastStatus }}</strong>
              </div>
              <div>
                <span>第二次判定</span>
                <strong>{{ Math.max(0, SECOND_MECHANIC_RESOLVE_AT_SECONDS - preview.encounterElapsedSeconds.value).toFixed(1) }}s</strong>
              </div>
            </div>
          </div>

          <div class="bubble-test-controls">
            <fieldset class="configuration-picker">
              <legend>測試配置</legend>
              <button
                v-for="mode in configurationModes"
                :key="mode"
                type="button"
                :class="{ active: preview.configurationMode.value === mode }"
                :aria-pressed="preview.configurationMode.value === mode"
                @click="preview.setConfigurationMode(mode)"
              >
                {{ mode === 'random' ? '隨機 A／B' : `固定 ${mode}` }}
              </button>
            </fieldset>

            <div class="bubble-display-toggles">
              <label class="trajectory-toggle">
                <input v-model="showTrajectories" type="checkbox">
                <span><strong>顯示移動軌跡</strong><small>開發測試輔助，預設隱藏</small></span>
              </label>
              <label class="trajectory-toggle">
                <input
                  type="checkbox"
                  :checked="arenaMarkers.showArenaMarkers.value"
                  @change="arenaMarkers.setShowArenaMarkers(($event.target as HTMLInputElement).checked)"
                >
                <span><strong>場地標記</strong><small>顯示 A～D、1～4</small></span>
              </label>
            </div>
          </div>

          <label class="speed-control">
            <span><strong>移動速度</strong><output>{{ preview.speed.value.toFixed(2) }} 格／秒</output></span>
            <input
              type="range"
              :min="BUBBLE_MIN_SPEED_TILES_PER_SECOND"
              :max="BUBBLE_MAX_SPEED_TILES_PER_SECOND"
              step="0.01"
              :value="preview.speed.value"
              @input="preview.setSpeed(Number(($event.target as HTMLInputElement).value))"
            >
          </label>

          <div class="bubble-summary">
            <div><span>場上泡泡</span><strong>{{ preview.bubbles.value.length }} / 16</strong></div>
            <div><span>泡泡直徑</span><strong>0.5 格</strong></div>
            <div>
              <span>動畫狀態</span>
              <strong v-if="preview.dead.value" class="bubble-dead-label">死亡</strong>
              <strong v-else>{{ bubbleStatus }}</strong>
            </div>
          </div>

          <section
            class="npc-route-debug"
            :class="{ warning: preview.npcDebugAlerts.value.length > 0 }"
            aria-live="polite"
          >
            <div>
              <strong>NPC 路線除錯</strong>
              <span>{{ preview.npcDebugAlerts.value.length ? `${preview.npcDebugAlerts.value.length} 個碰撞` : '路線安全' }}</span>
            </div>
            <p v-if="preview.npcDebugAlerts.value.length === 0">
              第一次水化爆彈的 NPC 路線尚未偵測到泡泡或黃圈碰撞。
            </p>
            <ul v-else>
              <li v-for="alert in preview.npcDebugAlerts.value" :key="alert.id">
                <time>T+{{ alert.atSeconds.toFixed(1) }}s</time>
                {{ alert.message }}
              </li>
            </ul>
          </section>

          <div class="provisional-note">
            <strong>目前實作範圍</strong>
            <p>每次重播會獨立隨機「先分攤／先分散」與泡泡 A／B 配置。答題只驗證判讀，不會改變實際 Debuff 順序。</p>
            <p>第一次水化爆彈會為四人各生成三輪固定黃圈；NPC 依職責、機制順序與泡泡 A／B 配置沿預設路線移動，碰到泡泡時會停在接觸前並顯示除錯提示。玩家仍完全手動操作，拖曳移動與 NPC 共用 0.40 格／秒速度上限。</p>
            <p>NPC 的分攤／分散傷害判定與第二次判定後走位仍未加入。</p>
          </div>
        </section>
      </aside>
    </div>
  </main>
</template>
