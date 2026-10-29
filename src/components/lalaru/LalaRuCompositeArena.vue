<script setup lang="ts">
import { computed, watch } from 'vue';
import {
  LALARU_BOSS_POSITION,
  LALARU_FIELD_SIZE,
  LALARU_PLAYER_RADIUS,
  COMPOSITE_TIMING,
  attackSectorPath,
  cellKey,
  safeBoundaryLines,
  type AnalysisDebuff,
  type ArenaPoint,
  type CardinalDirection,
  type CompositeOrb,
  type CompositePattern,
  type DirectionMarker,
  type GridCell,
  type GridDirection,
  type LalaRuMode,
  type LalaRuQuestion,
  type RotationMultiplicationCue
} from '../../mechanics/lalaru/index.ts';
import type {
  BossCannonState,
  CompositeAnalysisResult,
  CompositeDeathRecord,
  CompositeOrbAnalysisResult,
  CompositePhase,
  PlayerRotationState
} from '../../composables/useLalaRuCompositeTrainer.ts';
import { useLalaRuArenaInteraction } from '../../composables/useLalaRuArenaInteraction.ts';
import { worldPointToCameraPoint } from '../../presentation/lalaru/camera.ts';
import { MECHANIC_ICONS, type MechanicIconName } from '../../assets/mechanic-icons.ts';
import AnalysisRing from './AnalysisRing.vue';
import MechanicIcon from '../trainer/MechanicIcon.vue';
import TrainerCameraControls from '../trainer/TrainerCameraControls.vue';
import PlayerFacingIndicator from './PlayerFacingIndicator.vue';
import RotationCueIcon from './RotationCueIcon.vue';
import TrainerStartOverlay from '../trainer/TrainerStartOverlay.vue';
import { trainerResultLabel } from '../../presentation/trainer-result.ts';
import { LALARU_BOSS_DIAMETER } from '../../presentation/lalaru/actor-visuals.ts';

const props = defineProps<{
  phase: CompositePhase;
  mode: LalaRuMode;
  paused: boolean;
  pattern: CompositePattern;
  playerPosition: ArenaPoint;
  playerFacingAngle: number;
  playerGapRotationDegrees: number;
  analysisDebuff: AnalysisDebuff;
  orbAnalysisResults: readonly CompositeOrbAnalysisResult[];
  highPrecisionResult: CompositeAnalysisResult | null;
  highPrecisionImpactKey: number;
  bossQuestion: LalaRuQuestion;
  bossFinalSafeDirection: CardinalDirection;
  bossCannonState: BossCannonState;
  bossDotCount: number;
  bossAnimationKey: number;
  playerRotationCue: RotationMultiplicationCue;
  playerRotationState: PlayerRotationState;
  playerRotationDotCount: number;
  playerRotationAnimationKey: number;
  currentStep: number;
  activeCells: readonly GridCell[];
  dangerousCells: readonly GridCell[];
  explodedOrbIds: readonly string[];
  explodingOrbIds: readonly string[];
  explosionKey: number;
  deathRecord: CompositeDeathRecord | null;
  cameraResetKey: number;
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
  canMove: () => props.phase !== 'resolved' && props.phase !== 'dead',
  canRotateCamera: () => props.phase !== 'idle',
  updatePlayerPosition: position => emit('updatePlayerPosition', position),
  getFacingAngle: () => props.playerFacingAngle,
  updateFacingAngle: facingAngle => emit('updatePlayerFacingAngle', facingAngle)
});

watch(() => props.cameraResetKey, () => resetCamera());

const allCells = Array.from({ length: 25 }, (_, index) => ({
  row: Math.floor(index / 5),
  col: index % 5
}));
const activeKeys = computed(() => new Set(props.activeCells.map(cellKey)));
const dangerousKeys = computed(() => new Set(props.dangerousCells.map(cellKey)));
const routeKeys = computed(() => new Set(props.pattern.routes.flat().map(cellKey)));
const explodedIds = computed(() => new Set(props.explodedOrbIds));
const explodingIds = computed(() => new Set(props.explodingOrbIds));
const latestAnalysisResult = computed(() => props.orbAnalysisResults.at(-1) ?? null);
const bossDisplayedSafeDirection = computed(() =>
  props.bossCannonState === 'resolving' || props.bossCannonState === 'resolved'
    ? props.bossFinalSafeDirection
    : props.bossQuestion.initialSafeDirection
);
const bossAttackPath = computed(() => attackSectorPath(bossDisplayedSafeDirection.value));
const bossBoundaryPoints = computed(() => safeBoundaryLines(bossDisplayedSafeDirection.value));
const playerCueStyle = computed(() => {
  const screenPoint = worldPointToCameraPoint(props.playerPosition, cameraRotation.value);
  return {
    left: `${screenPoint.x / LALARU_FIELD_SIZE * 100}%`,
    top: `${screenPoint.y / LALARU_FIELD_SIZE * 100}%`
  };
});
const analysisIconNames: Readonly<Record<AnalysisDebuff, MechanicIconName>> = {
  front: 'analysisFront',
  back: 'analysisBack',
  left: 'analysisLeft',
  right: 'analysisRight'
};
const timingStyle = {
  '--active-pulse-duration': `${COMPOSITE_TIMING.activePulseMs}ms`,
  '--orb-explosion-duration': `${COMPOSITE_TIMING.orbExplosionMs}ms`,
  '--boss-cannon-impact-duration': `${COMPOSITE_TIMING.bossCannonImpactMs}ms`,
  '--high-precision-impact-duration': `${COMPOSITE_TIMING.highPrecisionImpactMs}ms`
};

const directionDegrees: Readonly<Record<GridDirection, number>> = {
  up: -90,
  right: 0,
  down: 90,
  left: 180
};

function actorStyle(point: ArenaPoint, diameter: number): Record<string, string> {
  return {
    left: `${point.x / LALARU_FIELD_SIZE * 100}%`,
    top: `${point.y / LALARU_FIELD_SIZE * 100}%`,
    width: `${diameter / LALARU_FIELD_SIZE * 100}%`
  };
}

function cellStyle(cell: GridCell): Record<string, string> {
  return { left: `${cell.col * 20}%`, top: `${cell.row * 20}%` };
}

function markerStyle(marker: DirectionMarker): Record<string, string> {
  return {
    ...cellStyle(marker.cell),
    '--arrow-rotation': `${directionDegrees[marker.direction]}deg`
  };
}

function orbStyle(orb: CompositeOrb): Record<string, string> {
  return cellStyle(orb.cell);
}
</script>

<template>
  <div class="composite-arena-shell">
    <div
      ref="cameraViewport"
      class="composite-camera-viewport"
      :class="{ 'rotating-camera': rotatingCamera }"
      :style="timingStyle"
      aria-label="拉拉魯複合魔紋 5×5 練習場地"
      @pointerdown="beginCameraDrag"
      @pointermove="moveCamera"
      @pointerup="endCameraDrag"
      @pointercancel="endCameraDrag"
      @contextmenu.prevent
    >
      <div class="composite-arena" :style="cameraStyle">
        <div class="cardinal cardinal-north">N</div>
        <div class="cardinal cardinal-east">E</div>

        <div class="cell-layer" aria-hidden="true">
          <span
            v-for="cell in allCells"
            :key="cellKey(cell)"
            class="floor-cell"
            :class="{
              'route-preview': mode === 'tutorial' && phase !== 'idle' && phase !== 'analysis-lead' && routeKeys.has(cellKey(cell)),
              dangerous: dangerousKeys.has(cellKey(cell)),
              active: activeKeys.has(cellKey(cell))
            }"
            :style="cellStyle(cell)"
          ></span>
        </div>

        <svg
          v-if="bossCannonState === 'telegraph' || bossCannonState === 'resolving'"
          class="boss-cannon-layer"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <path
            :d="bossAttackPath"
            class="boss-cannon-sector"
            :class="{ resolving: bossCannonState === 'resolving' }"
          />
          <g class="boss-cannon-boundaries">
            <line
              v-for="(point, index) in bossBoundaryPoints"
              :key="index"
              x1="50"
              y1="50"
              :x2="point.x"
              :y2="point.y"
            />
          </g>
        </svg>

        <div
          v-for="(start, index) in pattern.starts"
          v-show="phase !== 'idle' && phase !== 'analysis-lead'"
          :key="`start-${index}`"
          class="direction-marker start-marker"
          :style="markerStyle(start)"
          aria-hidden="true"
        ><span>➜</span></div>
        <div
          v-for="(turn, index) in pattern.turns"
          v-show="phase !== 'idle' && phase !== 'analysis-lead'"
          :key="`turn-${index}`"
          class="direction-marker turn-marker"
          :style="markerStyle(turn)"
          aria-hidden="true"
        ><span>➜</span></div>

        <div
          v-for="orb in pattern.orbs"
          v-show="phase !== 'idle' && phase !== 'analysis-lead' && (!explodedIds.has(orb.id) || explodingIds.has(orb.id))"
          :key="orb.id"
          class="composite-orb-cell"
          :class="{ exploding: explodingIds.has(orb.id) }"
          :style="orbStyle(orb)"
          aria-hidden="true"
        ><span class="composite-orb"></span></div>

        <div class="boss-actor" :style="actorStyle(LALARU_BOSS_POSITION, LALARU_BOSS_DIAMETER)">
          <span class="boss-facing" aria-hidden="true"></span>
          <span>拉拉魯</span>
        </div>

        <button
          class="composite-player"
          :class="{
            dragging,
            locked: phase === 'resolved' || phase === 'dead',
            success: phase === 'resolved' && succeeded,
            failure: phase === 'dead' || (phase === 'resolved' && succeeded === false)
          }"
          :style="actorStyle(playerPosition, LALARU_PLAYER_RADIUS * 2)"
          type="button"
          aria-label="玩家角色，可拖曳移動"
          :aria-disabled="phase === 'resolved' || phase === 'dead'"
          @pointerdown="beginPlayerDrag"
          @pointermove="movePlayer"
          @pointerup="endPlayerDrag"
          @pointercancel="endPlayerDrag"
        >
          <AnalysisRing
            v-if="phase !== 'idle'"
            :facing-angle="playerFacingAngle"
            :debuff="analysisDebuff"
            :additional-rotation-degrees="playerGapRotationDegrees"
          />
          <PlayerFacingIndicator :facing-angle="playerFacingAngle" />
          <span>YOU</span>
        </button>
      </div>

      <div v-if="explodingOrbIds.length" :key="explosionKey" class="orb-impact" aria-hidden="true"></div>
      <div
        v-if="bossCannonState === 'telegraph' || bossCannonState === 'resolving'"
        class="boss-rotation-cues"
      >
        <RotationCueIcon
          :arrow-side="bossQuestion.arrowSide"
          :dot-count="bossDotCount"
          :animation-key="bossAnimationKey"
          :playing="bossCannonState === 'telegraph'"
        />
        <MechanicIcon
          class="sequence-multiplier-icon"
          :name="bossQuestion.multiplier === 'III' ? 'multiplyIII' : 'multiplyV'"
          :alt="`Boss 乘算 ${bossQuestion.multiplier}`"
        />
      </div>
      <div
        v-if="playerRotationState === 'playing'"
        class="player-rotation-cues"
        :style="playerCueStyle"
      >
        <RotationCueIcon
          :arrow-side="playerRotationCue.arrowSide"
          :dot-count="playerRotationDotCount"
          :animation-key="playerRotationAnimationKey"
          :playing="true"
        />
        <MechanicIcon
          class="sequence-multiplier-icon"
          :name="playerRotationCue.multiplier === 'III' ? 'multiplyIII' : 'multiplyV'"
          :alt="`玩家乘算 ${playerRotationCue.multiplier}`"
        />
      </div>
      <div
        v-if="highPrecisionResult"
        :key="highPrecisionImpactKey"
        class="high-precision-impact"
        aria-hidden="true"
      ></div>
      <div v-if="phase !== 'idle'" class="analysis-debuff-badge" aria-label="分析 Debuff">
        <img :src="MECHANIC_ICONS[analysisIconNames[analysisDebuff]]" alt="分析 Debuff" />
      </div>
      <div
        v-if="mode === 'tutorial' && latestAnalysisResult"
        class="analysis-impact-result"
        :class="latestAnalysisResult.succeeded ? 'success' : 'failure'"
      >
        光球 {{ orbAnalysisResults.length }}：{{ latestAnalysisResult.succeeded ? '缺口正確' : '方向錯誤' }}
      </div>

      <TrainerStartOverlay
        v-if="phase === 'idle'"
        description="開始後先預覽步進路線，再處理光球、王炮與缺口。"
        @start="emit('start')"
      />

      <div v-if="paused" class="pause-badge">PAUSED</div>
      <div v-if="phase === 'resolved'" class="arena-result" :class="succeeded ? 'success' : 'failure'">
        {{ trainerResultLabel(succeeded === true) }}
      </div>
      <div v-if="phase === 'dead' && deathRecord" class="arena-result failure">{{ trainerResultLabel(false) }}</div>
    </div>

    <TrainerCameraControls
      class="camera-controls-shell"
      :rotation="cameraRotation"
      :visible="phase !== 'idle'"
      @rotate="rotateCameraBy"
      @reset="resetCamera"
    />
  </div>
</template>

<style scoped>
.composite-arena-shell { display: grid; width: 100%; height: 100%; min-height: 0; align-content: center; place-items: center; }
.composite-camera-viewport { position: relative; width: min(100%, 680px, calc(100cqh - 58px)); aspect-ratio: 1; overflow: hidden; border-radius: 15px; background: #07131c; cursor: grab; touch-action: none; }
.composite-camera-viewport.rotating-camera { cursor: grabbing; }
.composite-arena { position: absolute; inset: 0; overflow: hidden; border: 2px solid #527285; border-radius: 15px; background: radial-gradient(circle at 50% 50%, rgba(74, 129, 139, .2), transparent 48%), #172a32; transform: rotate(var(--camera-rotation)); transform-origin: center; will-change: transform; }
.composite-arena::after { position: absolute; inset: 0; z-index: 10; border: 1px solid rgba(171, 232, 244, .25); border-radius: 12px; content: ''; pointer-events: none; }
.cell-layer { position: absolute; inset: 0; z-index: 1; }
.boss-cannon-layer { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; overflow: hidden; pointer-events: none; }
.boss-cannon-sector { fill: rgba(224, 54, 60, .3); stroke: rgba(255, 103, 87, .5); stroke-width: .45; }
.boss-cannon-sector.resolving { fill: rgba(244, 48, 61, .58); animation: cannon-impact var(--boss-cannon-impact-duration) ease-out both; }
.boss-cannon-boundaries line { stroke: #ff554f; stroke-width: 1.2; filter: drop-shadow(0 0 1.2px #ff3f38); }
.floor-cell { position: absolute; width: 20%; height: 20%; border: 1px solid rgba(138, 177, 183, .24); background: linear-gradient(135deg, rgba(69, 86, 75, .18), rgba(17, 34, 39, .16)); transition: background .14s ease, box-shadow .14s ease; }
.floor-cell.route-preview { background: rgba(68, 165, 194, .10); box-shadow: inset 0 0 0 1px rgba(99, 214, 240, .22); }
.floor-cell.dangerous { background: linear-gradient(135deg, rgba(31, 166, 197, .44), rgba(42, 104, 159, .53)); box-shadow: inset 0 0 15px rgba(84, 229, 255, .46), inset 0 0 0 2px rgba(92, 218, 255, .46); }
.floor-cell.active { z-index: 2; background: rgba(113, 237, 255, .78); box-shadow: inset 0 0 20px #d9fbff, 0 0 22px rgba(74, 225, 255, .88); animation: active-cell-pulse var(--active-pulse-duration) ease-out both; }
.direction-marker, .composite-orb-cell { position: absolute; z-index: 4; display: grid; width: 20%; height: 20%; place-items: center; pointer-events: none; }
.direction-marker span { display: block; font-size: clamp(28px, 6cqw, 54px); line-height: 1; transform: rotate(var(--arrow-rotation)); filter: drop-shadow(0 0 5px currentColor); }
.start-marker { color: #ffe568; box-shadow: inset 0 0 0 3px #75eaff, inset 0 0 22px rgba(70, 224, 255, .62); }
.turn-marker { color: #79dfff; }
.composite-orb { width: 42%; aspect-ratio: 1; border: 2px solid #e9fbff; border-radius: 50%; background: radial-gradient(circle at 36% 30%, #fff, #bcebf6 30%, #678995 64%, #eaffff); box-shadow: 0 0 9px #c8f8ff, inset -4px -5px 8px rgba(26, 55, 68, .7); }
.composite-orb-cell.exploding .composite-orb { animation: orb-charge var(--orb-explosion-duration) ease-out both; }
.boss-actor { position: absolute; z-index: 5; display: grid; aspect-ratio: 1; place-items: center; border: 3px solid #a7ce62; border-radius: 50%; color: #eaffc8; background: radial-gradient(circle, #4d5530, #1b2318 72%); font-size: clamp(9px, 1.5vw, 14px); font-weight: 850; transform: translate(-50%, -50%); box-shadow: 0 0 0 4px rgba(166, 214, 97, .16), 0 0 22px rgba(0, 0, 0, .65); }
.boss-facing { position: absolute; top: -12px; left: 50%; width: 0; height: 0; border-right: 7px solid transparent; border-bottom: 11px solid #d9f37b; border-left: 7px solid transparent; transform: translateX(-50%); }
.composite-player { position: absolute; z-index: 8; display: grid; aspect-ratio: 1; padding: 0; place-items: center; border: 2px solid #ffe26f; border-radius: 50%; color: white; background: #174e68; cursor: grab; transform: translate(-50%, -50%); box-shadow: 0 0 0 4px rgba(255, 226, 111, .18), 0 4px 11px rgba(0, 0, 0, .52); touch-action: none; }
.composite-player > span:last-child { position: relative; z-index: 5; font-size: clamp(7px, 1.2vw, 11px); font-weight: 900; pointer-events: none; }
.composite-player.dragging { cursor: grabbing; box-shadow: 0 0 0 6px rgba(255, 255, 255, .35); }
.composite-player.locked { cursor: default; }
.composite-player.success { border-color: #74efaf; background: #176444; }
.composite-player.failure { border-color: #ff6474; background: #8c2732; }
.cardinal { position: absolute; z-index: 6; color: rgba(218, 244, 248, .75); font: 800 12px ui-monospace, monospace; pointer-events: none; }
.cardinal-north { top: 8px; left: 50%; transform: translateX(-50%); }
.cardinal-east { top: 50%; right: 9px; transform: translateY(-50%); }
.orb-impact { position: absolute; inset: 0; z-index: 15; pointer-events: none; animation: orb-impact var(--orb-explosion-duration) ease-out both; }
.boss-rotation-cues { position: absolute; top: 31%; left: 50%; z-index: 17; display: flex; align-items: center; gap: 7px; transform: translate(-50%, -50%); pointer-events: none; }
.player-rotation-cues { position: absolute; z-index: 18; display: flex; align-items: center; gap: 5px; transform: translate(-50%, -118%) scale(.82); transform-origin: center bottom; pointer-events: none; }
.sequence-multiplier-icon { width: 30px; height: 40px; filter: drop-shadow(0 0 6px rgba(109, 229, 220, .38)); }
.high-precision-impact { position: absolute; inset: 0; z-index: 19; pointer-events: none; animation: high-precision-impact var(--high-precision-impact-duration) ease-out both; }
.analysis-debuff-badge { position: absolute; top: 4%; left: 4%; z-index: 14; display: grid; width: 36px; height: 44px; place-items: center; border: 1px solid #d4ad55; border-radius: 7px; background: rgba(32, 26, 14, .9); box-shadow: 0 0 14px rgba(231, 185, 75, .22); pointer-events: none; }
.analysis-debuff-badge img { width: 28px; height: 36px; image-rendering: auto; }
.analysis-impact-result { position: absolute; top: 5%; right: 4%; z-index: 16; padding: 7px 11px; border: 1px solid currentColor; border-radius: 999px; background: rgba(6, 18, 25, .9); font-size: 12px; font-weight: 800; pointer-events: none; }
.analysis-impact-result.success { color: #7cebb4; }
.analysis-impact-result.failure { color: #ff7b88; }
.pause-badge, .arena-result { position: absolute; top: 6%; left: 50%; z-index: 21; padding: 7px 18px; border: 1px solid currentColor; border-radius: 999px; background: rgba(6, 18, 25, .88); font: 900 14px ui-monospace, monospace; letter-spacing: .15em; transform: translateX(-50%); }
.pause-badge { color: #ffd76c; }
.arena-result.success { color: #7cebb4; }
.arena-result.failure { color: #ff7b88; }
@keyframes active-cell-pulse { from { filter: brightness(1.75); } to { filter: brightness(1); } }
@keyframes cannon-impact { 0% { opacity: .25; } 28% { opacity: 1; } 100% { opacity: .86; } }
@keyframes orb-charge { 0% { transform: scale(1); } 35% { transform: scale(1.45); filter: brightness(2); } 100% { transform: scale(.1); opacity: 0; } }
@keyframes orb-impact { 0% { background: rgba(224, 253, 255, .9); box-shadow: inset 0 0 0 0 rgba(173, 244, 255, .9); } 45% { background: rgba(104, 224, 255, .28); box-shadow: inset 0 0 0 12cqw rgba(183, 247, 255, .35); } 100% { background: transparent; box-shadow: inset 0 0 0 40cqw rgba(183, 247, 255, 0); } }
@keyframes high-precision-impact { 0% { background: rgba(255, 244, 196, .88); } 42% { background: rgba(255, 174, 78, .24); box-shadow: inset 0 0 0 12cqw rgba(255, 213, 127, .3); } 100% { background: transparent; box-shadow: inset 0 0 0 40cqw transparent; } }
@media (max-width: 860px) { .composite-arena-shell { height: auto; } .composite-camera-viewport, .camera-controls-shell { width: min(100%, 680px); } }
</style>
