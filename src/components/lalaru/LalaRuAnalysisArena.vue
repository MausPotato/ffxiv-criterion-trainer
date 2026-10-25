<script setup lang="ts">
import { computed } from 'vue';
import {
  ANALYSIS_TIMING,
  LALARU_BOSS_POSITION,
  LALARU_FIELD_SIZE,
  LALARU_PLAYER_RADIUS,
  type AnalysisDebuff,
  type ArenaPoint
} from '../../mechanics/lalaru/index.ts';
import type { AnalysisPhase } from '../../composables/useLalaRuAnalysisTrainer.ts';
import { useLalaRuArenaInteraction } from '../../composables/useLalaRuArenaInteraction.ts';
import { CAMERA_ROTATION_STEP_DEGREES } from '../../presentation/lalaru/camera.ts';
import { MECHANIC_ICONS, type MechanicIconName } from '../../assets/mechanic-icons.ts';
import AnalysisRing from './AnalysisRing.vue';
import PlayerFacingIndicator from './PlayerFacingIndicator.vue';

const props = defineProps<{
  phase: AnalysisPhase;
  playerPosition: ArenaPoint;
  playerFacingAngle: number;
  orbPosition: ArenaPoint;
  debuff: AnalysisDebuff;
  result: boolean | null;
  explosionKey: number;
}>();

const emit = defineEmits<{
  start: [];
  updatePlayerPosition: [position: ArenaPoint];
  updatePlayerFacingAngle: [facingAngle: number];
}>();

const {
  cameraViewport,
  dragging,
  cameraRotation,
  rotatingCamera,
  cameraStyle,
  beginPlayerDrag,
  movePlayer,
  endPlayerDrag,
  rotateCameraBy,
  beginCameraDrag,
  moveCamera,
  endCameraDrag,
  resetCamera
} = useLalaRuArenaInteraction({
  getPlayerPosition: () => props.playerPosition,
  canMove: () => props.phase !== 'resolved',
  updatePlayerPosition: position => emit('updatePlayerPosition', position),
  getFacingAngle: () => props.playerFacingAngle,
  updateFacingAngle: angle => emit('updatePlayerFacingAngle', angle)
});

const debuffLabels: Readonly<Record<AnalysisDebuff, string>> = {
  front: '正面未解析',
  back: '背面未解析',
  left: '左側未解析',
  right: '右側未解析'
};
const analysisIconNames: Readonly<Record<AnalysisDebuff, MechanicIconName>> = {
  front: 'analysisFront',
  back: 'analysisBack',
  left: 'analysisLeft',
  right: 'analysisRight'
};
const timingStyle = computed(() => ({ '--analysis-explosion-duration': `${ANALYSIS_TIMING.explosionMs}ms` }));

function actorStyle(point: ArenaPoint, diameter: number): Record<string, string> {
  return {
    left: `${point.x / LALARU_FIELD_SIZE * 100}%`,
    top: `${point.y / LALARU_FIELD_SIZE * 100}%`,
    width: `${diameter / LALARU_FIELD_SIZE * 100}%`
  };
}
</script>

<template>
  <div class="analysis-arena-shell">
    <div
      ref="cameraViewport"
      class="analysis-camera-viewport"
      :class="{ 'rotating-camera': rotatingCamera }"
      :style="timingStyle"
      aria-label="拉拉魯分析方向練習場地"
      @pointerdown="beginCameraDrag"
      @pointermove="moveCamera"
      @pointerup="endCameraDrag"
      @pointercancel="endCameraDrag"
      @contextmenu.prevent
    >
      <div class="analysis-arena" :style="cameraStyle">
        <div class="cardinal cardinal-north">N</div>
        <div class="cardinal cardinal-east">E</div>

        <div class="boss-actor" :style="actorStyle(LALARU_BOSS_POSITION, .72)">
          <span class="boss-facing" aria-hidden="true"></span>
          <span>拉拉魯</span>
        </div>

        <div
          class="analysis-orb"
          :class="{ exploding: phase === 'resolved' }"
          :style="actorStyle(orbPosition, .48)"
          aria-label="分析光球"
        ></div>

        <button
          class="analysis-player"
          :class="{ dragging, locked: phase === 'resolved', success: result, failure: result === false }"
          :style="actorStyle(playerPosition, LALARU_PLAYER_RADIUS * 2)"
          type="button"
          aria-label="玩家角色，可拖曳移動"
          :aria-disabled="phase === 'resolved'"
          @pointerdown="beginPlayerDrag"
          @pointermove="movePlayer"
          @pointerup="endPlayerDrag"
          @pointercancel="endPlayerDrag"
        >
          <AnalysisRing :facing-angle="playerFacingAngle" :debuff="debuff" />
          <PlayerFacingIndicator :facing-angle="playerFacingAngle" />
          <span>YOU</span>
        </button>
      </div>

      <div class="debuff-badge">
        <img :src="MECHANIC_ICONS[analysisIconNames[debuff]]" alt="" />
        <span>ANALYSIS</span><strong>{{ debuffLabels[debuff] }}</strong>
      </div>
      <div v-if="phase === 'active'" class="analysis-progress"><span :style="{ '--resolve-duration': `${ANALYSIS_TIMING.resolveMs}ms` }"></span></div>
      <div v-if="phase === 'resolved'" :key="explosionKey" class="analysis-impact" aria-hidden="true"></div>

      <div v-if="phase === 'idle'" class="analysis-start-overlay">
        <span class="start-rune" aria-hidden="true">◇</span>
        <button class="primary-button start-button" type="button" @click="emit('start')">開始分析練習</button>
        <small>WASD 移動・Q/E 原地轉向・右鍵拖曳視角</small>
      </div>

      <div v-if="phase === 'resolved'" class="arena-result" :class="result ? 'success' : 'failure'">
        {{ result ? 'OPEN SIDE' : 'BLOCKED' }}
      </div>
    </div>

    <div class="camera-controls" aria-label="視角控制">
      <button type="button" @click="rotateCameraBy(-CAMERA_ROTATION_STEP_DEGREES)">逆時針 90°</button>
      <button type="button" @click="resetCamera">重置視角</button>
      <button type="button" @click="rotateCameraBy(CAMERA_ROTATION_STEP_DEGREES)">順時針 90°</button>
    </div>
    <p class="camera-readout">WASD／方向鍵移動・Q/E 轉向・視角 {{ Math.round(cameraRotation) }}°</p>
  </div>
</template>

<style scoped>
.analysis-arena-shell { display: grid; width: 100%; height: 100%; min-height: 0; align-content: center; place-items: center; }
.analysis-camera-viewport { position: relative; width: min(100%, 680px, calc(100cqh - 58px)); aspect-ratio: 1; overflow: hidden; border-radius: 15px; background: #07131c; cursor: grab; touch-action: none; }
.analysis-camera-viewport.rotating-camera { cursor: grabbing; }
.analysis-arena { position: absolute; inset: 0; overflow: hidden; border: 2px solid #527285; border-radius: 15px; background-color: #162934; background-image: linear-gradient(rgba(139, 187, 202, .19) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 187, 202, .19) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(75, 137, 151, .19), transparent 46%); background-size: 20% 20%, 20% 20%, 100% 100%; transform: rotate(var(--camera-rotation)); transform-origin: center; will-change: transform; }
.analysis-arena::after { position: absolute; inset: 0; z-index: 10; border: 1px solid rgba(181, 225, 235, .17); border-radius: 12px; content: ''; pointer-events: none; }
.boss-actor { position: absolute; z-index: 4; display: grid; aspect-ratio: 1; place-items: center; border: 3px solid #a7ce62; border-radius: 50%; color: #eaffc8; background: radial-gradient(circle, #4d5530, #1b2318 72%); font-size: clamp(9px, 1.5vw, 14px); font-weight: 850; transform: translate(-50%, -50%); }
.boss-facing { position: absolute; top: -12px; left: 50%; width: 0; height: 0; border-right: 7px solid transparent; border-bottom: 11px solid #d9f37b; border-left: 7px solid transparent; transform: translateX(-50%); }
.analysis-orb { position: absolute; z-index: 5; aspect-ratio: 1; border: 2px solid #e9fbff; border-radius: 50%; background: radial-gradient(circle at 36% 30%, #fff, #bcebf6 30%, #678995 64%, #eaffff); transform: translate(-50%, -50%); box-shadow: 0 0 14px #c8f8ff, inset -4px -5px 8px rgba(26, 55, 68, .7); }
.analysis-orb.exploding { animation: orb-explode var(--analysis-explosion-duration) ease-out both; }
.analysis-player { position: absolute; z-index: 8; display: grid; aspect-ratio: 1; padding: 0; place-items: center; border: 2px solid #ffe26f; border-radius: 50%; color: white; background: #174e68; cursor: grab; transform: translate(-50%, -50%); box-shadow: 0 0 0 4px rgba(255, 226, 111, .18), 0 4px 11px rgba(0, 0, 0, .52); touch-action: none; }
.analysis-player > span:last-child { position: relative; z-index: 5; font-size: clamp(7px, 1.2vw, 11px); font-weight: 900; pointer-events: none; }
.analysis-player.dragging { cursor: grabbing; } .analysis-player.locked { cursor: default; }
.analysis-player.success { border-color: #74efaf; background: #176444; } .analysis-player.failure { border-color: #ff6474; background: #8c2732; }
.cardinal { position: absolute; z-index: 3; color: rgba(190, 230, 240, .7); font: 800 12px ui-monospace, monospace; pointer-events: none; }
.cardinal-north { top: 8px; left: 50%; transform: translateX(-50%); } .cardinal-east { top: 50%; right: 9px; transform: translateY(-50%); }
.debuff-badge { position: absolute; top: 5%; left: 5%; z-index: 14; display: grid; grid-template-columns: 32px auto; grid-template-rows: auto auto; column-gap: 8px; align-items: center; padding: 7px 10px; border: 1px solid #d4ad55; border-radius: 8px; color: #ffe8a2; background: rgba(32, 26, 14, .9); box-shadow: 0 0 14px rgba(231, 185, 75, .22); pointer-events: none; }
.debuff-badge img { grid-row: 1 / 3; width: 24px; height: 32px; }
.debuff-badge span { font: 700 9px ui-monospace, monospace; letter-spacing: .14em; } .debuff-badge strong { margin-top: 2px; font-size: 13px; }
.analysis-progress { position: absolute; right: 5%; bottom: 5%; left: 5%; z-index: 14; height: 5px; overflow: hidden; border-radius: 99px; background: rgba(20, 45, 57, .8); }
.analysis-progress span { display: block; width: 100%; height: 100%; background: linear-gradient(90deg, #66d6ed, #f5c568); transform-origin: left; animation: resolve-progress var(--resolve-duration) linear forwards; }
.analysis-impact { position: absolute; inset: 0; z-index: 15; pointer-events: none; animation: analysis-impact var(--analysis-explosion-duration) ease-out both; }
.analysis-start-overlay { position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: rgba(5, 14, 22, .68); backdrop-filter: blur(2px); }
.analysis-start-overlay small { color: #b5c9d3; } .start-rune { color: #65d7ed; font-size: 30px; text-shadow: 0 0 22px #52d1ec; }
.arena-result { position: absolute; top: 6%; left: 50%; z-index: 21; padding: 7px 18px; border: 1px solid currentColor; border-radius: 999px; background: rgba(6, 18, 25, .88); font: 900 14px ui-monospace, monospace; letter-spacing: .15em; transform: translateX(-50%); }
.arena-result.success { color: #7cebb4; } .arena-result.failure { color: #ff7b88; }
.camera-controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; width: min(100%, 680px, calc(100cqh - 58px)); margin-top: 10px; }
.camera-controls button { min-height: 36px; padding: 7px 9px; border: 1px solid #3b596a; border-radius: 8px; color: #c7dbe3; background: #10212d; cursor: pointer; font-size: 12px; }
.camera-readout { width: min(100%, 680px, calc(100cqh - 58px)); margin: 6px 0 0; color: var(--text-helper); font: 11px ui-monospace, monospace; text-align: center; }
@keyframes resolve-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes orb-explode { 0% { transform: translate(-50%, -50%) scale(1); } 40% { transform: translate(-50%, -50%) scale(1.8); filter: brightness(2); } 100% { transform: translate(-50%, -50%) scale(.1); opacity: 0; } }
@keyframes analysis-impact { 0% { background: rgba(229, 254, 255, .92); } 45% { background: rgba(105, 223, 255, .24); box-shadow: inset 0 0 0 12cqw rgba(189, 248, 255, .3); } 100% { background: transparent; box-shadow: inset 0 0 0 40cqw transparent; } }
@media (max-width: 860px) { .analysis-arena-shell { height: auto; } .analysis-camera-viewport, .camera-controls, .camera-readout { width: min(100%, 680px); } }
</style>
