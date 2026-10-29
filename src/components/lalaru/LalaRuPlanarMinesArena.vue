<script setup lang="ts">
import { computed } from 'vue';
import PlayerFacingIndicator from './PlayerFacingIndicator.vue';
import RotationCueIcon from './RotationCueIcon.vue';
import PlanarActorDebuffs from './PlanarActorDebuffs.vue';
import { useLalaRuArenaInteraction } from '../../composables/useLalaRuArenaInteraction.ts';
import {
  LALARU_FIELD_SIZE,
  type ArenaPoint,
  type PlanarAssignedPosition,
  type PlanarMineCell,
  type PlanarMineRevealState,
  type PlanarPartyId,
  type PlanarPhase
} from '../../mechanics/lalaru/index.ts';
import { worldPointToCameraPoint } from '../../presentation/lalaru/camera.ts';
import TrainerCameraControls from '../trainer/TrainerCameraControls.vue';
import TrainerStartOverlay from '../trainer/TrainerStartOverlay.vue';
import { trainerResultLabel } from '../../presentation/trainer-result.ts';

const props = defineProps<{
  mineCells: readonly PlanarMineCell[];
  missingCell: PlanarMineCell;
  playerPosition: ArenaPoint;
  playerFacingAngle: number;
  playerAssignment: PlanarAssignedPosition;
  npcAssignments: readonly PlanarAssignedPosition[];
  showNpcs: boolean;
  canOperate: boolean;
  debuffsVisible: boolean;
  mineRevealState: PlanarMineRevealState;
  rotationCueVisible: boolean;
  rotationDotCount: number;
  rotationAnimationKey: number;
  remainingSeconds: number;
  actorPositions: Readonly<Record<PlanarPartyId, ArenaPoint>>;
  actorFacingAngles: Readonly<Record<PlanarPartyId, number>>;
  remainingLayers: Readonly<Record<PlanarPartyId, number>>;
  triggeredMineKeys: readonly string[];
  explodingMineKeys: readonly string[];
  stackResolvingTargetIds: readonly PlanarPartyId[];
  phase: PlanarPhase;
}>();

const emit = defineEmits<{
  start: [];
  updatePlayerPosition: [position: ArenaPoint];
  updatePlayerFacingAngle: [facingAngle: number];
}>();

const cells = Array.from({ length: 25 }, (_, index) => ({
  row: Math.floor(index / 5),
  col: index % 5
}));
const partyLabels = { 'npc-a': 'A', 'npc-b': 'B', 'npc-c': 'C' } as const;

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
  canMove: () => props.canOperate,
  canRotateCamera: () => props.phase !== 'idle',
  updatePlayerPosition: position => emit('updatePlayerPosition', position),
  getFacingAngle: () => props.playerFacingAngle,
  updateFacingAngle: angle => emit('updatePlayerFacingAngle', angle)
});

const playerStyle = computed(() => pointStyle(props.playerPosition));

function pointStyle(point: ArenaPoint): Record<string, string> {
  return {
    left: `${point.x / LALARU_FIELD_SIZE * 100}%`,
    top: `${point.y / LALARU_FIELD_SIZE * 100}%`
  };
}

function npcStyle(assignment: PlanarAssignedPosition): Record<string, string> {
  const position = props.actorPositions[assignment.member.id] ?? assignment.worldPosition;
  return pointStyle(position);
}

function rotationCueStyle(point: ArenaPoint): Record<string, string> {
  const screenPoint = worldPointToCameraPoint(point, cameraRotation.value);
  return {
    left: `${screenPoint.x / LALARU_FIELD_SIZE * 100}%`,
    top: `${screenPoint.y / LALARU_FIELD_SIZE * 100}%`
  };
}

function cellStyle(cell: PlanarMineCell): Record<string, string> {
  return { left: `${cell.col * 20}%`, top: `${cell.row * 20}%` };
}

function isMissing(cell: PlanarMineCell): boolean {
  return cell.row === props.missingCell.row && cell.col === props.missingCell.col;
}

function mineKey(cell: PlanarMineCell): string {
  return `${cell.row}-${cell.col}`;
}

</script>

<template>
  <div class="planar-arena-shell">
    <div
      ref="cameraViewport"
      class="planar-camera-viewport"
      :class="{ 'rotating-camera': rotatingCamera }"
      @pointerdown="beginCameraDrag"
      @pointermove="moveCamera"
      @pointerup="endCameraDrag"
      @pointercancel="endCameraDrag"
    >
      <div class="planar-arena" :style="cameraStyle">
        <div
          v-for="cell in cells"
          :key="`${cell.row}-${cell.col}`"
          class="floor-cell"
          :class="{ 'missing-corner': mineRevealState === 'full' && isMissing(cell) }"
          :style="cellStyle(cell)"
        ></div>

        <div
          v-for="mine in mineRevealState === 'hidden' ? [] : mineCells"
          :key="`mine-${mine.row}-${mine.col}`"
          class="mine-cell"
          :class="[
            mineRevealState,
            { triggered: triggeredMineKeys.includes(mineKey(mine)), exploding: explodingMineKeys.includes(mineKey(mine)) }
          ]"
          :style="cellStyle(mine)"
        >
          <span class="mine-core"></span>
          <span v-if="explodingMineKeys.includes(mineKey(mine))" class="mine-explosion" aria-hidden="true"></span>
        </div>

        <div
          v-for="assignment in showNpcs ? npcAssignments : []"
          :key="assignment.member.id"
          class="party-actor npc-actor"
          :style="npcStyle(assignment)"
        >
          <PlayerFacingIndicator :facing-angle="actorFacingAngles[assignment.member.id]" />
          <strong>{{ partyLabels[assignment.member.id as keyof typeof partyLabels] }}</strong>
          <span
            v-if="debuffsVisible && assignment.member.explosionTarget"
            class="stack-range"
            :class="{ resolving: stackResolvingTargetIds.includes(assignment.member.id) }"
            aria-hidden="true"
          ></span>
          <PlanarActorDebuffs
            v-if="debuffsVisible"
            :member="assignment.member"
            :remaining-layer="remainingLayers[assignment.member.id]"
            :remaining-seconds="remainingSeconds"
            :camera-rotation="cameraRotation"
          />
        </div>

        <button
          class="party-actor player-actor"
          :class="{ dragging }"
          :style="playerStyle"
          type="button"
          aria-label="玩家角色"
          @pointerdown.stop="beginPlayerDrag"
          @pointermove="movePlayer"
          @pointerup="endPlayerDrag"
          @pointercancel="endPlayerDrag"
        >
          <PlayerFacingIndicator :facing-angle="playerFacingAngle" />
          <strong>YOU</strong>
          <span
            v-if="debuffsVisible && playerAssignment.member.explosionTarget"
            class="stack-range"
            :class="{ resolving: stackResolvingTargetIds.includes('you') }"
            aria-hidden="true"
          ></span>
          <PlanarActorDebuffs
            v-if="debuffsVisible"
            :member="playerAssignment.member"
            :remaining-layer="remainingLayers.you"
            :remaining-seconds="remainingSeconds"
            :camera-rotation="cameraRotation"
          />
        </button>

        <span class="cardinal cardinal-north">N</span>
        <span class="cardinal cardinal-east">E</span>
      </div>

      <template v-if="rotationCueVisible">
        <div
          v-for="assignment in showNpcs ? npcAssignments : []"
          :key="`rotation-cue-${assignment.member.id}`"
          class="actor-rotation-cue"
          :style="rotationCueStyle(actorPositions[assignment.member.id] ?? assignment.worldPosition)"
        >
          <RotationCueIcon :arrow-side="assignment.member.arrowSide" :dot-count="rotationDotCount" :animation-key="rotationAnimationKey" playing />
        </div>
        <div class="actor-rotation-cue" :style="rotationCueStyle(playerPosition)">
          <RotationCueIcon :arrow-side="playerAssignment.member.arrowSide" :dot-count="rotationDotCount" :animation-key="rotationAnimationKey" playing />
        </div>
      </template>

      <TrainerStartOverlay
        v-if="phase === 'idle'"
        description="開始後取得 Debuff，在倒數內完成站位與面向調整。"
        @start="emit('start')"
      />
      <div v-else-if="phase === 'resolved'" class="planar-result success">{{ trainerResultLabel(true) }}</div>
      <div v-else-if="phase === 'dead'" class="planar-result failure">{{ trainerResultLabel(false) }}</div>
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
.planar-arena-shell { display: grid; width: 100%; height: 100%; min-height: 0; align-content: center; place-items: center; }
.planar-camera-viewport { position: relative; width: min(100%, 680px, calc(100cqh - 58px)); aspect-ratio: 1; overflow: hidden; border-radius: 15px; background: #07131c; cursor: grab; touch-action: none; }
.planar-camera-viewport.rotating-camera { cursor: grabbing; }
.planar-arena { position: absolute; inset: 0; overflow: hidden; border: 2px solid #527285; border-radius: 15px; background: radial-gradient(circle at 50% 50%, rgba(74, 129, 139, .2), transparent 48%), #172a32; transform: rotate(var(--camera-rotation)); transform-origin: center; will-change: transform; }
.planar-arena::after { position: absolute; inset: 0; z-index: 20; border: 1px solid rgba(171, 232, 244, .25); border-radius: 12px; content: ''; pointer-events: none; }
.floor-cell, .mine-cell { position: absolute; width: 20%; height: 20%; }
.floor-cell { border: 1px solid rgba(138, 177, 183, .25); background: linear-gradient(135deg, rgba(69, 86, 75, .18), rgba(17, 34, 39, .16)); }
.floor-cell.missing-corner { box-shadow: inset 0 0 0 2px rgba(114, 232, 185, .26); }
.mine-cell { z-index: 3; display: grid; place-items: stretch; pointer-events: none; }
.mine-core { display: block; border: 1px solid #ffe58b; background: linear-gradient(135deg, rgba(184, 67, 39, .9), rgba(124, 43, 31, .94)); box-shadow: inset 0 0 18px rgba(255, 145, 67, .48), inset 0 0 0 2px rgba(255, 218, 125, .32), 0 0 8px #ffd36a, 0 0 17px rgba(255, 113, 45, .52); }
.mine-cell.telegraph { opacity: .24; animation: mine-telegraph .7s ease-in-out infinite alternate; }
.mine-cell.full { opacity: 1; }
.mine-cell.triggered .mine-core { opacity: 0; filter: saturate(.2); box-shadow: none; transition: opacity .18s ease-out; }
.mine-cell.exploding .mine-core { opacity: 1; filter: brightness(2.3); }
.mine-explosion { position: absolute; inset: 4%; z-index: 8; border: 4px solid #fff3a6; border-radius: 18%; background: radial-gradient(circle, rgba(255,255,255,.95), rgba(255,170,46,.7) 30%, rgba(255,73,24,.12) 72%); box-shadow: 0 0 24px #ffb12d; animation: mine-burst .42s ease-out both; }
.party-actor { position: absolute; z-index: 9; display: grid; width: 8%; aspect-ratio: 1; padding: 0; place-items: center; border: 2px solid #72dcef; border-radius: 50%; color: #f0fdff; background: #174e68; transform: translate(-50%, -50%); box-shadow: 0 0 0 4px rgba(91, 215, 239, .15), 0 4px 12px rgba(0, 0, 0, .5); }
.party-actor strong { font-size: clamp(8px, 1.4cqw, 13px); }
.npc-actor { border-color: #95d7ae; background: #24533d; }
.player-actor { border-color: #ffe26f; cursor: grab; touch-action: none; }
.player-actor.dragging { cursor: grabbing; box-shadow: 0 0 0 6px rgba(255, 255, 255, .32); }
.stack-range { position: absolute; top: 50%; left: 50%; z-index: -1; width: 300%; aspect-ratio: 1; border: 2px solid rgba(215, 178, 255, .82); border-radius: 50%; background: rgba(133, 78, 186, .08); box-shadow: 0 0 8px rgba(189, 127, 255, .48), inset 0 0 8px rgba(189, 127, 255, .18); transform: translate(-50%, -50%); pointer-events: none; }
.stack-range.resolving { z-index: 8; border-width: 4px; background: rgba(205, 158, 255, .36); box-shadow: 0 0 24px #c58aff, inset 0 0 18px rgba(255,255,255,.7); animation: stack-impact .65s ease-out both; }
.actor-rotation-cue { position: absolute; z-index: 27; transform: translate(-50%, -118%) scale(.72); transform-origin: center bottom; pointer-events: none; }
.cardinal { position: absolute; z-index: 6; color: rgba(218, 244, 248, .75); font: 800 12px ui-monospace, monospace; pointer-events: none; }
.cardinal-north { top: 8px; left: 50%; transform: translateX(-50%); } .cardinal-east { top: 50%; right: 9px; transform: translateY(-50%); }
.planar-result { position: absolute; top: 14px; left: 50%; z-index: 28; padding: 8px 20px; border: 1px solid currentColor; border-radius: 999px; transform: translateX(-50%); font-weight: 900; letter-spacing: .12em; background: rgba(5, 15, 22, .9); }
.planar-result.success { color: #72f0ad; }.planar-result.failure { color: #ff647c; }
@keyframes mine-telegraph { from { filter: brightness(.65); } to { filter: brightness(1.25); } }
@keyframes mine-burst { from { opacity: 1; transform: scale(.35); } to { opacity: 0; transform: scale(1.35); } }
@keyframes stack-impact { 0% { opacity: .35; transform: translate(-50%, -50%) scale(.65); } 55% { opacity: 1; } 100% { opacity: .18; transform: translate(-50%, -50%) scale(1.1); } }
@media (max-width: 860px) { .planar-arena-shell { height: auto; } .planar-camera-viewport, .camera-controls-shell { width: min(100%, 680px); } }
</style>
