<script setup lang="ts">
import { computed, ref } from 'vue';
import ArenaFloor from './ArenaFloor.vue';
import {
  BUBBLE_FIELD_SIZE,
  BUBBLE_RADIUS_TILES,
  type BubbleDefinition,
  type BubbleVector
} from '../../mechanics/ketuduke/bubbles.ts';
import {
  PLAYER_RADIUS_TILES,
  playerPositionFromDrag
} from '../../presentation/ketuduke/player-drag.ts';
import {
  GROUND_AOE_DIAMETER_TILES,
  type GroundAoeSnapshot
} from '../../mechanics/ketuduke/bubble-timeline.ts';
import type { BubblePartyMember } from '../../mechanics/ketuduke/bubble-party.ts';
import type { Role } from '../../domain/roles.ts';

interface RangePreview {
  position: BubbleVector;
  diameterTiles: number;
  countdownSeconds: number;
  resolving: boolean;
}

const props = defineProps<{
  bubbles: readonly (BubbleDefinition & { x: number; y: number })[];
  paths: readonly BubbleDefinition[];
  showTrajectories: boolean;
  playerPosition: BubbleVector;
  playerRoleLabel: string;
  npcMembers: readonly BubblePartyMember[];
  playerDisabled: boolean;
  deathCause: string | null;
  capturedBubbleId: string | null;
  capturedRole: Role | null;
  mechanicElapsedSeconds: number;
  groundAoes: readonly GroundAoeSnapshot[];
  spreadPreview: RangePreview | null;
  stackPreview: RangePreview | null;
}>();

const emit = defineEmits<{
  updatePlayerPosition: [position: BubbleVector];
  playerDragStart: [];
  playerDragEnd: [];
}>();

const playerLayer = ref<HTMLElement | null>(null);
const draggingPlayer = ref(false);
let activePointerId: number | null = null;
let grabOffset: BubbleVector = { x: 0, y: 0 };

const capturedBubble = computed(() => props.bubbles.find(
  bubble => bubble.id === props.capturedBubbleId
) ?? null);

function bubbleStyle(bubble: BubbleDefinition & { x: number; y: number }): Record<string, string> {
  return {
    left: `${bubble.x * 25}%`,
    top: `${bubble.y * 25}%`,
    width: `${BUBBLE_RADIUS_TILES * 2 * 25}%`
  };
}

function pathStyle(path: BubbleDefinition): Record<string, string> {
  const vertical = path.side === 'top' || path.side === 'bottom';
  const lane = vertical ? path.x : path.y;
  return vertical
    ? { left: `${lane * 25}%`, top: '0', height: '100%' }
    : { left: '0', top: `${lane * 25}%`, width: '100%' };
}

function actorStyle(position: BubbleVector): Record<string, string> {
  return {
    left: `${position.x / BUBBLE_FIELD_SIZE * 100}%`,
    top: `${position.y / BUBBLE_FIELD_SIZE * 100}%`,
    width: `${PLAYER_RADIUS_TILES * 2 / BUBBLE_FIELD_SIZE * 100}%`
  };
}

function rangeStyle(position: BubbleVector, diameterTiles: number): Record<string, string> {
  return {
    left: `${position.x / BUBBLE_FIELD_SIZE * 100}%`,
    top: `${position.y / BUBBLE_FIELD_SIZE * 100}%`,
    width: `${diameterTiles / BUBBLE_FIELD_SIZE * 100}%`
  };
}

function pointerGridPosition(event: PointerEvent): BubbleVector | null {
  const bounds = playerLayer.value?.getBoundingClientRect();
  if (!bounds || bounds.width === 0 || bounds.height === 0) return null;
  return {
    x: (event.clientX - bounds.left) / bounds.width * BUBBLE_FIELD_SIZE,
    y: (event.clientY - bounds.top) / bounds.height * BUBBLE_FIELD_SIZE
  };
}

function beginPlayerDrag(event: PointerEvent): void {
  if (props.playerDisabled || activePointerId !== null) return;
  const pointer = pointerGridPosition(event);
  if (!pointer) return;
  activePointerId = event.pointerId;
  draggingPlayer.value = true;
  grabOffset = {
    x: pointer.x - props.playerPosition.x,
    y: pointer.y - props.playerPosition.y
  };
  emit('playerDragStart');
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  event.preventDefault();
}

function movePlayer(event: PointerEvent): void {
  if (event.pointerId !== activePointerId) return;
  const pointer = pointerGridPosition(event);
  if (!pointer) return;
  emit('updatePlayerPosition', playerPositionFromDrag(pointer, grabOffset));
  event.preventDefault();
}

function endPlayerDrag(event: PointerEvent): void {
  if (event.pointerId !== activePointerId) return;
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  activePointerId = null;
  draggingPlayer.value = false;
  emit('playerDragEnd');
  event.preventDefault();
}
</script>

<template>
  <div class="arena-wrap bubble-arena-wrap">
    <ArenaFloor>
      <div class="bubble-mechanic-layer" aria-hidden="true" inert>
        <span
          v-for="aoe in groundAoes"
          :key="aoe.id"
          class="ground-yellow-aoe"
          :class="{ exploding: mechanicElapsedSeconds >= aoe.explodeAtSeconds }"
          :style="rangeStyle(aoe.position, GROUND_AOE_DIAMETER_TILES)"
        >{{ aoe.sourceRole }} · {{ aoe.round }}</span>
        <span
          v-if="spreadPreview"
          class="mechanic-range-preview spread-preview"
          :class="{ resolving: spreadPreview.resolving }"
          :style="rangeStyle(spreadPreview.position, spreadPreview.diameterTiles)"
        >
          <span>分散 {{ spreadPreview.countdownSeconds.toFixed(1) }}</span>
        </span>
        <span
          v-if="stackPreview"
          class="mechanic-range-preview stack-preview"
          :class="{ resolving: stackPreview.resolving }"
          :style="rangeStyle(stackPreview.position, stackPreview.diameterTiles)"
        >
          <span>分攤 {{ stackPreview.countdownSeconds.toFixed(1) }}</span>
        </span>
      </div>
      <div v-if="showTrajectories" class="bubble-trajectory-layer" aria-hidden="true" inert>
        <span
          v-for="path in paths"
          :key="`path-${path.id}`"
          class="bubble-trajectory"
          :class="`from-${path.side}`"
          :style="pathStyle(path)"
        ></span>
      </div>
      <div class="bubble-layer" aria-hidden="true" inert>
        <span
          v-for="bubble in bubbles"
          :key="bubble.id"
          class="moving-bubble"
          :class="{ captured: bubble.id === capturedBubbleId }"
          :style="bubbleStyle(bubble)"
        ></span>
      </div>
      <div ref="playerLayer" class="bubble-player-layer">
        <span
          v-for="npc in npcMembers"
          :key="npc.role"
          class="bubble-npc-marker"
          :class="[`side-${npc.side}`, { captured: npc.role === capturedRole }]"
          :style="actorStyle(npc.position)"
          :aria-label="`${npc.label} NPC`"
        >
          {{ npc.label }}
        </span>
        <button
          class="bubble-player-marker"
          :class="{
            dragging: draggingPlayer,
            disabled: playerDisabled,
            captured: capturedRole === playerRoleLabel
          }"
          type="button"
          :aria-label="`可拖曳 ${playerRoleLabel} 玩家位置`"
          :aria-disabled="playerDisabled"
          :style="actorStyle(playerPosition)"
          @pointerdown="beginPlayerDrag"
          @pointermove="movePlayer"
          @pointerup="endPlayerDrag"
          @pointercancel="endPlayerDrag"
        >
          <span>{{ playerRoleLabel }}</span>
        </button>
      </div>
      <div v-if="capturedBubble" class="bubble-capture-layer" aria-hidden="true" inert>
        <span class="moving-bubble captured-bubble" :style="bubbleStyle(capturedBubble)"></span>
      </div>
      <div v-if="playerDisabled" class="bubble-death-state" role="status" aria-live="assertive">
        <strong>YOU DIED</strong>
        <span v-if="deathCause">死因: {{ deathCause }}</span>
      </div>
    </ArenaFloor>
  </div>
</template>
