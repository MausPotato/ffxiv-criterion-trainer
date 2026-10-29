<script setup lang="ts">
import { computed, watch } from 'vue';
import {
  LALARU_BOSS_POSITION,
  LALARU_FIELD_SIZE,
  LALARU_PLAYER_RADIUS,
  SPATIAL_BOMBS_TIMING,
  attackSectorPath,
  cellKey,
  safeBoundaryLines,
  type ArenaPoint,
  type GridCell,
  type SpatialBombPattern,
  type SpatialPartyId
} from '../../mechanics/lalaru/index.ts';
import type { SpatialBombPhase, SpatialDeathRecord } from '../../composables/useLalaRuSpatialBombsTrainer.ts';
import { useLalaRuArenaInteraction } from '../../composables/useLalaRuArenaInteraction.ts';
import type { LalaRuQuestion } from '../../mechanics/lalaru/types.ts';
import type { CardinalDirection } from '../../mechanics/lalaru/types.ts';
import RotationCueIcon from './RotationCueIcon.vue';
import TrainerCameraControls from '../trainer/TrainerCameraControls.vue';
import MechanicIcon from '../trainer/MechanicIcon.vue';
import { MECHANIC_ICONS } from '../../assets/mechanic-icons.ts';
import TrainerStartOverlay from '../trainer/TrainerStartOverlay.vue';
import { LALARU_BOSS_DIAMETER } from '../../presentation/lalaru/actor-visuals.ts';

const props = defineProps<{
  phase: SpatialBombPhase;
  pattern: SpatialBombPattern;
  playerPosition: ArenaPoint;
  playerFacingAngle: number;
  actorPositions: Readonly<Record<SpatialPartyId, ArenaPoint>>;
  remainingLayers: Readonly<Record<SpatialPartyId, number>>;
  deadActorIds: readonly SpatialPartyId[];
  activeCells: readonly GridCell[];
  dangerousCells: readonly GridCell[];
  explodingSourceIds: readonly string[];
  removedSourceIds: readonly string[];
  cannonQuestion: LalaRuQuestion;
  cannonSafeDirection: CardinalDirection;
  cannonSeconds: number;
  cannonImpactKey: number;
  cameraResetKey: number;
  deathRecord: SpatialDeathRecord | null;
  succeeded: boolean | null;
}>();

const emit = defineEmits<{
  start: [];
  updatePlayerPosition: [position: ArenaPoint];
  updatePlayerFacingAngle: [angle: number];
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
  canMove: () => props.phase !== 'idle' && props.phase !== 'dead' && props.phase !== 'resolved',
  canRotateCamera: () => props.phase !== 'idle',
  updatePlayerPosition: position => emit('updatePlayerPosition', position),
  getFacingAngle: () => props.playerFacingAngle,
  updateFacingAngle: angle => emit('updatePlayerFacingAngle', angle)
});

watch(() => props.cameraResetKey, () => resetCamera(), { immediate: true });

const allCells = Array.from({ length: 25 }, (_, index) => ({
  row: Math.floor(index / 5),
  col: index % 5
}));
const activeKeys = computed(() => new Set(props.activeCells.map(cellKey)));
const dangerousKeys = computed(() => new Set(props.dangerousCells.map(cellKey)));
const routeKeys = computed(() => new Set(Object.values(props.pattern.routes).flat().map(step => cellKey(step.cell))));
const turnMarkers = computed(() => Object.values(props.pattern.routes).flatMap(route => route
  .map((step, index) => ({ step, next: route[index + 1] }))
  .filter(marker => marker.step.event === 'turn' && marker.next)
  .map(marker => ({
    ...marker.step,
    rotation: directionRotation(marker.step.cell, marker.next!.cell)
  }))));
const removedIds = computed(() => new Set(props.removedSourceIds));
const explodingIds = computed(() => new Set(props.explodingSourceIds));
const deadIds = computed(() => new Set(props.deadActorIds));
const explodingBombs = computed(() => props.pattern.bombs.filter(bomb => explodingIds.value.has(bomb.id)));
const whiteOrbExploding = computed(() => explodingIds.value.has('white-orb'));
const questionVisible = computed(() => props.phase !== 'idle' && props.phase !== 'lead-in');
const showCannon = computed(() => props.phase === 'cannon-countdown' || props.phase === 'cannon-impact');
const displayedCannonSafeDirection = computed(() => props.phase === 'cannon-impact'
  ? props.cannonSafeDirection
  : props.cannonQuestion.initialSafeDirection);
const cannonAttackPath = computed(() => attackSectorPath(displayedCannonSafeDirection.value));
const cannonBoundaries = computed(() => safeBoundaryLines(displayedCannonSafeDirection.value));
const actorLabels: Readonly<Record<SpatialPartyId, string>> = {
  you: 'YOU',
  'npc-a': 'A',
  'npc-b': 'B',
  'npc-c': 'C'
};
const subtractionIcons = {
  1: MECHANIC_ICONS.spatialSubtractionOne,
  2: MECHANIC_ICONS.spatialSubtractionTwo,
  3: MECHANIC_ICONS.spatialSubtractionThree,
  4: MECHANIC_ICONS.spatialSubtractionFour
} as const;
const timingStyle = {
  '--explosion-duration': `${SPATIAL_BOMBS_TIMING.explosionDurationMs}ms`,
  '--npc-move-duration': `${SPATIAL_BOMBS_TIMING.npcMoveDurationMs}ms`,
  '--cannon-impact-duration': `${SPATIAL_BOMBS_TIMING.cannonImpactMs}ms`
};

function cellStyle(cell: GridCell): Record<string, string> {
  return { left: `${cell.col * 20}%`, top: `${cell.row * 20}%` };
}

function directionRotation(from: GridCell, to: GridCell): number {
  if (to.col > from.col) return 0;
  if (to.row > from.row) return 90;
  if (to.col < from.col) return 180;
  return -90;
}

function startMarkerStyle(routeId: 'route-a' | 'route-b', cell: GridCell): Record<string, string> {
  const first = props.pattern.routes[routeId][0]!.cell;
  return { ...cellStyle(cell), '--arrow-rotation': `${directionRotation(cell, first)}deg` };
}

function actorStyle(point: ArenaPoint, diameter = LALARU_PLAYER_RADIUS * 2): Record<string, string> {
  return {
    left: `${point.x / LALARU_FIELD_SIZE * 100}%`,
    top: `${point.y / LALARU_FIELD_SIZE * 100}%`,
    width: `${diameter / LALARU_FIELD_SIZE * 100}%`
  };
}

function crossStyle(cell: GridCell): Record<string, string> {
  return {
    '--cross-row': `${cell.row * 20}%`,
    '--cross-col': `${cell.col * 20}%`
  };
}
</script>

<template>
  <div class="spatial-arena-shell">
    <div
      ref="cameraViewport"
      class="spatial-camera-viewport"
      :class="{ 'rotating-camera': rotatingCamera }"
      :style="timingStyle"
      aria-label="拉拉魯立體炸彈 5×5 練習場地"
      @pointerdown="beginCameraDrag"
      @pointermove="moveCamera"
      @pointerup="endCameraDrag"
      @pointercancel="endCameraDrag"
      @contextmenu.prevent
    >
      <div class="spatial-arena" :style="cameraStyle">
        <div class="cardinal cardinal-north">N</div>
        <div class="cardinal cardinal-east">E</div>

        <div class="cell-layer" aria-hidden="true">
          <span
            v-for="cell in allCells"
            :key="cellKey(cell)"
            class="floor-cell"
            :class="{
              'route-preview': questionVisible && routeKeys.has(cellKey(cell)),
              dangerous: dangerousKeys.has(cellKey(cell)),
              active: activeKeys.has(cellKey(cell))
            }"
            :style="cellStyle(cell)"
          ></span>
        </div>

        <div
          v-for="(start, id) in pattern.starts"
          v-show="questionVisible"
          :key="id"
          class="direction-marker start-marker"
          :style="startMarkerStyle(id, start)"
          aria-hidden="true"
        ><span>➜</span></div>
        <div
          v-for="turn in turnMarkers"
          v-show="questionVisible"
          :key="`turn-${turn.step}-${cellKey(turn.cell)}`"
          class="direction-marker turn-marker"
          :style="{ ...cellStyle(turn.cell), '--arrow-rotation': `${turn.rotation}deg` }"
          aria-hidden="true"
        ><span>➜</span></div>

        <div
          v-if="questionVisible && (!removedIds.has('white-orb') || whiteOrbExploding)"
          class="white-orb"
          :class="{ exploding: whiteOrbExploding }"
          :style="cellStyle(pattern.whiteOrb.cell)"
          aria-label="球體魔法陣"
        ><span></span></div>

        <div
          v-for="bomb in pattern.bombs"
          v-show="questionVisible && (!removedIds.has(bomb.id) || explodingIds.has(bomb.id))"
          :key="bomb.id"
          class="spatial-bomb"
          :class="{ exploding: explodingIds.has(bomb.id) }"
          :style="cellStyle(bomb.cell)"
          aria-label="立體炸彈"
        >
          <svg class="bomb-cube" viewBox="0 0 100 100" aria-hidden="true">
            <polygon class="cube-face cube-top" points="50,4 96,28 50,52 4,28" />
            <polygon class="cube-face cube-left" points="4,28 50,52 50,96 4,72" />
            <polygon class="cube-face cube-right" points="50,52 96,28 96,72 50,96" />
          </svg>
        </div>

        <div
          v-for="bomb in explodingBombs"
          :key="`cross-${bomb.id}`"
          class="cross-explosion"
          :style="crossStyle(bomb.cell)"
          aria-hidden="true"
        ><span class="cross-row"></span><span class="cross-column"></span></div>
        <div v-if="whiteOrbExploding" class="white-orb-impact" aria-hidden="true"></div>

        <svg v-if="showCannon" class="cannon-layer" viewBox="0 0 100 100" aria-hidden="true">
          <path :d="cannonAttackPath" class="cannon-sector" :class="{ resolving: phase === 'cannon-impact' }" />
          <line
            v-for="(point, index) in cannonBoundaries"
            :key="index"
            x1="50"
            y1="50"
            :x2="point.x"
            :y2="point.y"
            class="cannon-boundary"
          />
        </svg>

        <div class="spatial-boss" :style="actorStyle(LALARU_BOSS_POSITION, LALARU_BOSS_DIAMETER)">
          <span class="boss-facing" aria-hidden="true"></span>
          <span>拉拉魯</span>
        </div>

        <div v-if="showCannon" class="boss-cannon-cues">
          <RotationCueIcon
            v-if="phase === 'cannon-countdown'"
            :arrow-side="cannonQuestion.arrowSide"
            :dot-count="cannonSeconds"
            :animation-key="cannonImpactKey"
            :playing="true"
          />
          <MechanicIcon
            class="boss-multiplier-icon"
            :name="cannonQuestion.multiplier === 'III' ? 'multiplyIII' : 'multiplyV'"
            :alt="`Boss 乘算 ${cannonQuestion.multiplier}`"
          />
        </div>

        <div
          v-for="(position, id) in actorPositions"
          :key="id"
          class="spatial-actor"
          :class="{ player: id === 'you', npc: id !== 'you', dead: deadIds.has(id), dragging: id === 'you' && dragging }"
          :style="actorStyle(position, .4)"
          @pointerdown="id === 'you' && beginPlayerDrag($event)"
          @pointermove="id === 'you' && movePlayer($event)"
          @pointerup="id === 'you' && endPlayerDrag($event)"
          @pointercancel="id === 'you' && endPlayerDrag($event)"
        >
          <span>{{ actorLabels[id] }}</span>
          <img
            v-if="questionVisible && remainingLayers[id] > 0"
            class="actor-debuff-icon"
            :src="subtractionIcons[remainingLayers[id] as 1 | 2 | 3 | 4]"
            :alt="`減算炸彈 β ${remainingLayers[id]} 層`"
          />
          <b v-else-if="questionVisible" class="cleared">0</b>
        </div>

        <div v-if="phase === 'cannon-countdown'" class="cannon-countdown">{{ cannonSeconds }}</div>
        <div v-if="phase === 'cannon-impact'" :key="cannonImpactKey" class="cannon-impact"></div>
        <div v-if="phase === 'resolved'" class="arena-result success">CLEAR</div>
        <div v-if="phase === 'dead'" class="arena-result failure">FAILED</div>
      </div>
      <TrainerStartOverlay
        v-if="phase === 'idle'"
        description="開始後揭示配置，沿步進路線持續移動並避開爆炸。"
        @start="emit('start')"
      />
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
.spatial-arena-shell { display: grid; width: 100%; height: 100%; min-height: 0; align-content: center; place-items: center; }
.spatial-camera-viewport { position: relative; width: min(100%, 680px, calc(100cqh - 58px)); aspect-ratio: 1; overflow: hidden; border-radius: 15px; background: #07131c; container-type: inline-size; cursor: grab; touch-action: none; }
.spatial-camera-viewport.rotating-camera { cursor: grabbing; }
.spatial-arena { position: absolute; inset: 0; overflow: hidden; border: 2px solid #527285; border-radius: 15px; background: radial-gradient(circle at 50% 50%, rgba(74, 129, 139, .2), transparent 48%), #172a32; transform: rotate(var(--camera-rotation)); transform-origin: center; transition: transform .18s ease; }
.spatial-camera-viewport.rotating-camera .spatial-arena { transition: none; }
.spatial-arena::after { position: absolute; inset: 0; z-index: 24; border: 1px solid rgba(171, 232, 244, .25); border-radius: 12px; content: ''; pointer-events: none; }
.cell-layer { position: absolute; inset: 0; }
.floor-cell { position: absolute; width: 20%; height: 20%; border: 1px solid rgba(138, 177, 183, .24); background: linear-gradient(135deg, rgba(69, 86, 75, .18), rgba(17, 34, 39, .16)); transition: background .14s ease, box-shadow .14s ease; }
.floor-cell.route-preview { background: rgba(68, 165, 194, .1); box-shadow: inset 0 0 0 1px rgba(99, 214, 240, .22); }
.floor-cell.dangerous { z-index: 1; background: linear-gradient(135deg, rgba(31, 166, 197, .44), rgba(42, 104, 159, .53)); box-shadow: inset 0 0 15px rgba(84, 229, 255, .46), inset 0 0 0 2px rgba(92, 218, 255, .46); }
.floor-cell.active { z-index: 2; background: rgba(113, 237, 255, .78); box-shadow: inset 0 0 20px #d9fbff, 0 0 22px rgba(74, 225, 255, .88); animation: cell-pulse .55s ease-out; }
.cardinal { position: absolute; z-index: 14; color: #d8f5fc; font: 900 12px ui-monospace, monospace; pointer-events: none; }
.cardinal-north { top: 8px; left: 50%; transform: translateX(-50%); }.cardinal-east { top: 50%; right: 9px; transform: translateY(-50%); }
.direction-marker, .white-orb, .spatial-bomb { position: absolute; z-index: 5; display: grid; width: 20%; height: 20%; place-items: center; pointer-events: none; }
.direction-marker span { display: block; font-size: clamp(28px, 6cqw, 54px); line-height: 1; transform: rotate(var(--arrow-rotation)); filter: drop-shadow(0 0 5px currentColor); }
.start-marker { color: #ffe568; box-shadow: inset 0 0 0 3px #75eaff, inset 0 0 22px rgba(70, 224, 255, .62); }
.turn-marker { color: #79dfff; }
.white-orb span { width: 42%; aspect-ratio: 1; border: 2px solid white; border-radius: 50%; background: radial-gradient(circle at 35% 30%, white, #c8eafd 35%, #7298b7 72%); box-shadow: 0 0 15px 5px rgba(225, 247, 255, .62); }
.bomb-cube { display: block; width: 52%; height: 58%; overflow: visible; filter: drop-shadow(0 0 5px rgba(255, 91, 31, .9)) drop-shadow(0 0 3px rgba(255, 216, 95, .72)); animation: cube-float 1.6s ease-in-out infinite; }
.cube-face { stroke: rgba(255, 228, 133, .9); stroke-width: 2; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.cube-top { fill: #ffc84b; }.cube-left { fill: #dc5b24; }.cube-right { fill: #8f241e; }
.white-orb.exploding span, .spatial-bomb.exploding .bomb-cube { animation: bomb-pop var(--explosion-duration) ease-out both; }
.cross-explosion { position: absolute; inset: 0; z-index: 10; pointer-events: none; }
.cross-row, .cross-column { position: absolute; display: block; background: rgba(255, 103, 44, .55); box-shadow: inset 0 0 18px #fff19a, 0 0 15px #ff552a; animation: aoe-flash var(--explosion-duration) ease-out both; }
.cross-row { top: var(--cross-row); left: 0; width: 100%; height: 20%; }.cross-column { top: 0; left: var(--cross-col); width: 20%; height: 100%; }
.white-orb-impact { position: absolute; inset: 0; z-index: 11; background: rgba(224, 250, 255, .72); animation: aoe-flash var(--explosion-duration) ease-out both; pointer-events: none; }
.cannon-layer { position: absolute; inset: 0; z-index: 8; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.cannon-sector { fill: rgba(246, 76, 72, .24); stroke: #ff806d; stroke-width: .7; }.cannon-sector.resolving { fill: rgba(255, 90, 66, .7); }
.cannon-boundary { stroke: #ffc17d; stroke-width: .65; stroke-dasharray: 2 1; }
.spatial-boss { position: absolute; z-index: 12; display: grid; aspect-ratio: 1; place-items: center; border: 3px solid #efc96d; border-radius: 50%; color: #fff4c4; background: radial-gradient(circle, #5c4932, #211b19 72%); transform: translate(-50%, -50%); box-shadow: 0 0 0 4px rgba(239, 201, 109, .15), 0 0 22px rgba(0, 0, 0, .65); pointer-events: none; }
.spatial-boss > span:not(.boss-facing) { font-size: clamp(9px, 1.5cqw, 14px); font-weight: 850; }
.boss-facing { position: absolute; top: -12px; left: 50%; width: 0; height: 0; border-right: 7px solid transparent; border-bottom: 11px solid #ffdb78; border-left: 7px solid transparent; transform: translateX(-50%); }
.boss-cannon-cues { position: absolute; top: 31%; left: 50%; z-index: 19; display: flex; align-items: center; gap: 7px; transform: translate(-50%, -50%); pointer-events: none; }
.boss-cannon-cues :deep(.rotation-cue-icon) { transform: scale(.82); }
.boss-multiplier-icon { width: 30px; height: 40px; filter: drop-shadow(0 0 6px rgba(109, 229, 220, .55)) drop-shadow(0 2px 4px rgba(0, 0, 0, .85)); image-rendering: auto; }
.spatial-actor { position: absolute; z-index: 16; display: grid; aspect-ratio: 1; padding: 0; place-items: center; border: 2px solid #72dcef; border-radius: 50%; color: #f0fdff; background: #174e68; transform: translate(-50%, -50%); box-shadow: 0 0 0 4px rgba(91, 215, 239, .15), 0 4px 12px rgba(0, 0, 0, .5); pointer-events: none; }
.spatial-actor.npc { border-color: #95d7ae; background: #24533d; transition: left var(--npc-move-duration) linear, top var(--npc-move-duration) linear; }
.spatial-actor.player { border-color: #ffe26f; cursor: grab; pointer-events: auto; touch-action: none; }.spatial-actor.player.dragging { cursor: grabbing; box-shadow: 0 0 0 6px rgba(255, 255, 255, .32); }
.spatial-actor.dead { border-color: #ff6675; background: #7a2630; filter: grayscale(.6); }
.spatial-actor > span { font-size: clamp(6px, 1.4cqw, 10px); font-weight: 900; }
.actor-debuff-icon { position: absolute; bottom: 86%; left: 50%; z-index: 5; width: clamp(28px, 5.2cqw, 46px); height: clamp(28px, 5.2cqw, 46px); object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,.75)); transform: translateX(-50%); pointer-events: none; }
.spatial-actor b.cleared { position: absolute; bottom: 94%; left: 50%; display: grid; width: 27px; height: 27px; place-items: center; border: 1px solid #65dba4; border-radius: 5px; color: #8dffc1; background: #133b2c; font: 900 11px ui-monospace, monospace; transform: translateX(-50%); }
.cannon-countdown { position: absolute; top: 8%; left: 50%; z-index: 20; color: #fff5c1; font: 900 42px ui-monospace, monospace; text-shadow: 0 0 14px #ff9e32; transform: translateX(-50%); }
.cannon-impact { position: absolute; inset: 0; z-index: 18; animation: cannon-flash var(--cannon-impact-duration) ease-out both; pointer-events: none; }
.arena-result { position: absolute; top: 6%; left: 50%; z-index: 23; padding: 7px 18px; border: 1px solid currentColor; border-radius: 999px; background: rgba(6,18,25,.9); font: 900 14px ui-monospace, monospace; letter-spacing: .15em; transform: translateX(-50%); }.arena-result.success { color: #7cebb4; }.arena-result.failure { color: #ff7b88; }
@keyframes cell-pulse { from { filter: brightness(2.2); } to { filter: brightness(1); } }
@keyframes cube-float { 0%, 100% { translate: 0 -2px; } 50% { translate: 0 2px; } }
@keyframes bomb-pop { 0% { opacity: 1; transform: scale(1); } 45% { opacity: 1; transform: scale(1.5); } 100% { opacity: 0; transform: scale(.1); } }
@keyframes aoe-flash { 0% { opacity: .15; } 25% { opacity: 1; } 100% { opacity: 0; } }
@keyframes cannon-flash { 0% { background: rgba(255, 235, 167, .85); } 100% { background: transparent; } }
@media (max-width: 860px) { .spatial-arena-shell { height: auto; }.spatial-camera-viewport, .camera-controls-shell { width: min(100%, 680px); } }
</style>
