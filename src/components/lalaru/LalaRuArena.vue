<script setup lang="ts">
import { computed } from 'vue';
import {
  LALARU_BOSS_POSITION,
  LALARU_FIELD_SIZE,
  LALARU_PLAYER_RADIUS,
  attackSectorPath,
  safeBoundaryLines,
  safeSectorPath,
  type ArenaPoint,
  type ArrowSide,
  type CardinalDirection,
  type LalaRuMode,
  type LalaRuPhase,
  type Multiplier
} from '../../mechanics/lalaru/index.ts';
import {
  CAMERA_ROTATION_STEP_DEGREES
} from '../../presentation/lalaru/camera.ts';
import { useLalaRuArenaInteraction } from '../../composables/useLalaRuArenaInteraction.ts';
import RotationCueIcon from './RotationCueIcon.vue';
import MechanicIcon from '../trainer/MechanicIcon.vue';
import PlayerFacingIndicator from './PlayerFacingIndicator.vue';

const props = defineProps<{
  phase: LalaRuPhase;
  mode: LalaRuMode;
  playerPosition: ArenaPoint;
  playerFacingAngle: number;
  arrowSide: ArrowSide;
  multiplier: Multiplier;
  dotCount: number;
  animationKey: number;
  initialSafeDirection: CardinalDirection;
  finalSafeDirection: CardinalDirection;
  succeeded: boolean | null;
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
  beginPlayerDrag: beginDrag,
  movePlayer,
  endPlayerDrag: endDrag,
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
  updateFacingAngle: facingAngle => emit('updatePlayerFacingAngle', facingAngle)
});

const displayedSafeDirection = computed(() =>
  props.phase === 'resolved' ? props.finalSafeDirection : props.initialSafeDirection
);
const attackPath = computed(() => attackSectorPath(displayedSafeDirection.value));
const boundaryLines = computed(() => safeBoundaryLines(displayedSafeDirection.value));
const initialSafePath = computed(() => safeSectorPath(props.initialSafeDirection));
const finalSafePath = computed(() => safeSectorPath(props.finalSafeDirection));

function actorStyle(point: ArenaPoint, diameter: number): Record<string, string> {
  return {
    left: `${point.x / LALARU_FIELD_SIZE * 100}%`,
    top: `${point.y / LALARU_FIELD_SIZE * 100}%`,
    width: `${diameter / LALARU_FIELD_SIZE * 100}%`
  };
}

</script>

<template>
  <div class="lalaru-arena-shell">
    <div
      ref="cameraViewport"
      class="lalaru-camera-viewport"
      :class="{ 'rotating-camera': rotatingCamera }"
      aria-label="拉拉魯 5×5 練習場地；按住滑鼠右鍵水平拖曳可旋轉視角"
      @pointerdown="beginCameraDrag"
      @pointermove="moveCamera"
      @pointerup="endCameraDrag"
      @pointercancel="endCameraDrag"
      @contextmenu.prevent
    >
      <div class="lalaru-arena" :style="cameraStyle">
        <div class="cardinal cardinal-north">N</div>
        <div class="cardinal cardinal-east">E</div>

        <svg
          v-if="phase !== 'idle'"
          class="sector-layer"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            :d="attackPath"
            class="attack-sector"
            :class="{ resolving: phase === 'resolved' }"
          />
          <g class="telegraph-boundaries">
            <line
              v-for="(point, index) in boundaryLines"
              :key="index"
              x1="50"
              y1="50"
              :x2="point.x"
              :y2="point.y"
            />
          </g>
          <g v-if="phase === 'resolved' && mode === 'tutorial'" class="tutorial-safe-sectors">
            <path :d="initialSafePath" class="initial-safe-sector" />
            <path :d="finalSafePath" class="final-safe-sector" />
          </g>
        </svg>

        <div
          class="boss-actor"
          :style="actorStyle(LALARU_BOSS_POSITION, .72)"
          aria-label="拉拉魯，面向北方"
        >
          <span class="boss-facing" aria-hidden="true"></span>
          <span>拉拉魯</span>
        </div>

        <button
          class="lalaru-player"
          :class="{
            dragging,
            locked: phase === 'resolved',
            success: phase === 'resolved' && succeeded,
            failure: phase === 'resolved' && succeeded === false
          }"
          :style="actorStyle(playerPosition, LALARU_PLAYER_RADIUS * 2)"
          type="button"
          aria-label="可拖曳的玩家位置；方向鍵也可移動"
          :aria-disabled="phase === 'resolved'"
          @pointerdown="beginDrag"
          @pointermove="movePlayer"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <PlayerFacingIndicator :facing-angle="playerFacingAngle" />
          <span>YOU</span>
        </button>
      </div>

      <div v-if="phase === 'casting'" class="boss-cues">
        <RotationCueIcon
          :arrow-side="arrowSide"
          :dot-count="dotCount"
          :animation-key="animationKey"
          :playing="true"
        />
        <MechanicIcon
          class="multiplier-icon"
          :name="multiplier === 'III' ? 'multiplyIII' : 'multiplyV'"
          :alt="`乘算 ${multiplier}`"
        />
      </div>

      <div v-if="phase === 'idle'" class="lalaru-start-overlay">
        <span class="start-rune" aria-hidden="true">✦</span>
        <button class="primary-button start-button" type="button" @click="emit('start')">
          ▶ 開始練習
        </button>
        <small>左鍵拖曳角色；右鍵拖曳旋轉視角</small>
      </div>

      <div v-if="phase === 'resolved'" class="arena-result" :class="succeeded ? 'success' : 'failure'">
        {{ succeeded ? 'SAFE' : 'HIT' }}
      </div>
    </div>

    <div class="camera-controls" aria-label="視角控制">
      <button type="button" @click="rotateCameraBy(-CAMERA_ROTATION_STEP_DEGREES)">↺ 逆時針 90°</button>
      <button type="button" @click="resetCamera">北向上・重置視角</button>
      <button type="button" @click="rotateCameraBy(CAMERA_ROTATION_STEP_DEGREES)">↻ 順時針 90°</button>
    </div>
    <p class="camera-readout">右鍵水平拖曳自由旋轉 · {{ Math.round(cameraRotation) }}°</p>
  </div>
</template>

<style scoped>
.lalaru-arena-shell { display: grid; width: 100%; height: 100%; min-height: 0; align-content: center; place-items: center; }
.lalaru-camera-viewport {
  position: relative;
  width: min(100%, 680px, calc(100cqh - 58px));
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 15px;
  background: #09141d;
  cursor: grab;
  touch-action: none;
}
.lalaru-camera-viewport.rotating-camera { cursor: grabbing; }
.lalaru-arena {
  position: absolute;
  inset: 0;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid #527285;
  border-radius: 15px;
  background-color: #142735;
  background-image:
    linear-gradient(rgba(139, 187, 202, .19) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 187, 202, .19) 1px, transparent 1px),
    radial-gradient(circle at 50% 50%, rgba(75, 137, 151, .19), transparent 46%);
  background-size: 20% 20%, 20% 20%, 100% 100%;
  box-shadow: inset 0 0 60px rgba(2, 8, 14, .62), 0 18px 52px rgba(0, 0, 0, .25);
  transform: rotate(var(--camera-rotation));
  transform-origin: center;
  will-change: transform;
}
.lalaru-arena::after { position: absolute; inset: 0; border: 1px solid rgba(181, 225, 235, .17); border-radius: 12px; content: ''; pointer-events: none; }
.sector-layer { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; pointer-events: none; }
.attack-sector { fill: rgba(224, 54, 60, .30); stroke: rgba(255, 103, 87, .48); stroke-width: .45; }
.attack-sector.resolving { fill: rgba(244, 48, 61, .54); animation: impact-flash .55s ease-out both; }
.telegraph-boundaries line { stroke: #ff554f; stroke-width: 1.2; filter: drop-shadow(0 0 1.2px #ff3f38); }
.initial-safe-sector { fill: rgba(79, 176, 226, .30); stroke: #6ed7ff; stroke-width: .8; }
.final-safe-sector { fill: rgba(76, 220, 143, .32); stroke: #70ecad; stroke-width: .9; }
.boss-actor { position: absolute; z-index: 4; display: grid; aspect-ratio: 1; place-items: center; border: 3px solid #efc96d; border-radius: 50%; color: #fff4c4; background: radial-gradient(circle, #5c4932, #211b19 72%); font-size: clamp(9px, 1.5vw, 14px); font-weight: 850; transform: translate(-50%, -50%); box-shadow: 0 0 0 4px rgba(239, 201, 109, .15), 0 0 22px rgba(0, 0, 0, .65); }
.boss-facing { position: absolute; top: -12px; left: 50%; width: 0; height: 0; border-right: 7px solid transparent; border-bottom: 11px solid #ffdb78; border-left: 7px solid transparent; transform: translateX(-50%); }
.boss-cues { position: absolute; top: 33%; left: 50%; z-index: 7; display: flex; align-items: center; gap: 8px; transform: translate(-50%, -50%); pointer-events: none; }
.multiplier-icon { width: 36px; height: 48px; filter: drop-shadow(0 0 6px rgba(109, 229, 220, .38)); image-rendering: auto; }
.lalaru-player { position: absolute; z-index: 8; display: grid; aspect-ratio: 1; padding: 0; place-items: center; border: 2px solid #ffe26f; border-radius: 50%; color: white; background: #174e68; cursor: grab; transform: translate(-50%, -50%); box-shadow: 0 0 0 4px rgba(255, 226, 111, .18), 0 4px 11px rgba(0, 0, 0, .52); touch-action: none; }
.lalaru-player span { font-size: clamp(7px, 1.2vw, 11px); font-weight: 900; pointer-events: none; }
.lalaru-player.dragging { cursor: grabbing; box-shadow: 0 0 0 6px rgba(255, 255, 255, .35), 0 6px 18px rgba(0, 0, 0, .65); }
.lalaru-player.locked { cursor: default; }
.lalaru-player.success { border-color: #74efaf; background: #176444; }
.lalaru-player.failure { border-color: #ff6474; background: #8c2732; }
.cardinal { position: absolute; z-index: 3; color: rgba(190, 230, 240, .7); font: 800 12px ui-monospace, monospace; pointer-events: none; }
.cardinal-north { top: 8px; left: 50%; transform: translateX(-50%); }
.cardinal-east { top: 50%; right: 9px; transform: translateY(-50%); }
.lalaru-start-overlay { position: absolute; inset: 0; z-index: 12; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: rgba(5, 14, 22, .72); backdrop-filter: blur(3px); }
.lalaru-start-overlay small { color: #b5c9d3; }
.start-rune { color: #65d7ed; font-size: 30px; text-shadow: 0 0 22px #52d1ec; }
.arena-result { position: absolute; top: 6%; left: 50%; z-index: 10; padding: 7px 18px; border: 1px solid currentColor; border-radius: 999px; background: rgba(6, 18, 25, .88); font: 900 14px ui-monospace, monospace; letter-spacing: .15em; transform: translateX(-50%); }
.arena-result.success { color: #7cebb4; }
.arena-result.failure { color: #ff7b88; }
.camera-controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; width: min(100%, 680px, calc(100cqh - 58px)); margin-top: 10px; }
.camera-controls button { min-height: 36px; padding: 7px 9px; border: 1px solid #3b596a; border-radius: 8px; color: #c7dbe3; background: #10212d; cursor: pointer; font-size: 12px; }
.camera-controls button:hover { border-color: #5dc8df; color: #f1fcff; background: #173442; }
.camera-controls button:focus-visible { outline: 2px solid #68d7ed; outline-offset: 2px; }
.camera-readout { width: min(100%, 680px, calc(100cqh - 58px)); margin: 6px 0 0; color: var(--text-helper); font: 11px ui-monospace, monospace; text-align: center; }
@keyframes impact-flash { 0% { opacity: .2; } 28% { opacity: 1; } 100% { opacity: .84; } }

@media (max-width: 860px) {
  .lalaru-arena-shell { height: auto; }
  .lalaru-camera-viewport, .camera-controls, .camera-readout { width: min(100%, 680px); }
}

@media (max-width: 520px) {
  .camera-controls { grid-template-columns: 1fr 1fr; }
  .camera-controls button:nth-child(2) { grid-column: 1 / -1; grid-row: 2; }
}
</style>
