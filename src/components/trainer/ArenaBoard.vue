<script setup lang="ts">
import { computed } from 'vue';
import { toCellIndex, toCoordinate, type CellIndex } from '../../domain/grid.ts';
import { formatGridCoordinate } from '../../domain/grid-coordinate-format.ts';
import { ROLES, type PartialRoleMap, type Role } from '../../domain/roles.ts';
import type { Crystal, KetudukeQuestion, TrainerPhase, WindStep } from '../../mechanics/ketuduke/types.ts';
import type { QuadrantWindEffect } from '../../presentation/ketuduke/wind-effects.ts';
import {
  WIND_ACTOR_MOVE_DURATION_MS,
  WIND_HOLD_DURATION_MS,
  WIND_MOVE_DURATION_MS
} from '../../presentation/ketuduke/wind-effects.ts';
import CrystalMarker from './CrystalMarker.vue';
import RoleMarker from './RoleMarker.vue';

const props = defineProps<{
  question: KetudukeQuestion;
  ready: boolean;
  focus: Role | null;
  phase: TrainerPhase;
  interactive: boolean;
  queueCells: CellIndex[];
  crystals: Crystal[];
  review: boolean;
  safeCells: CellIndex[];
  hazardCells: CellIndex[];
  windStep: WindStep | null;
  windEffects: QuadrantWindEffect[];
  mahjongCues: QuadrantWindEffect[];
  animateActors: boolean;
  positions?: PartialRoleMap<CellIndex>;
}>();

const emit = defineEmits<{
  start: [];
  selectCell: [cell: CellIndex];
}>();

const cells = computed(() => Array.from({ length: 16 }, (_, index) => {
  const r = Math.floor(index / 4);
  const c = index % 4;
  const roles = ROLES.filter(role => props.positions?.[role] === index);
  return { index, r, c, roles, coordinateLabel: formatGridCoordinate({ r, c }) };
}));

const roleActors = computed(() => ROLES.flatMap(role => {
  const position = props.positions?.[role];
  if (position === undefined) return [];
  const occupants = ROLES.filter(candidate => props.positions?.[candidate] === position);
  const offset = (occupants.indexOf(role) - (occupants.length - 1) / 2) * 28;
  return [{ role, position, offset }];
}));

function actorStyle(position: CellIndex, offset = 0): Record<string, string> {
  const { r, c } = toCoordinate(position);
  return {
    '--actor-row': String(r),
    '--actor-column': String(c),
    '--actor-offset-y': `${offset}px`
  };
}

function selectCell(cell: CellIndex): void {
  if (!props.interactive) return;
  emit('selectCell', cell);
}

</script>

<template>
  <div class="arena-wrap">
    <div class="board" :class="{ inactive: !ready }">
      <button
        v-for="cell in cells"
        :key="cell.index"
        class="arena-tile"
        :class="{
          'queue-line': phase === 0 && queueCells.includes(cell.index),
          selected: cell.roles.length > 0,
          safe: review && safeCells.includes(cell.index),
          hazard: review && hazardCells.includes(cell.index)
        }"
        type="button"
        :aria-label="cell.coordinateLabel"
        :disabled="!interactive"
        @click="selectCell(cell.index)"
      ></button>

      <div v-if="mahjongCues.length" class="board-wind-cue-layer" aria-hidden="true" inert>
        <span
          v-for="cue in mahjongCues"
          :key="`wind-cue-${cue.quadrant}`"
          class="quadrant-wind-cue"
          :class="[`quadrant-${cue.quadrant}`, `wind-${cue.direction}`]"
        ></span>
      </div>

      <div v-if="mahjongCues.length" class="board-mahjong-layer" aria-hidden="true" inert>
        <span
          v-for="cue in mahjongCues"
          :key="`mahjong-${cue.quadrant}`"
          class="mahjong-quadrant-marker"
          :class="[`quadrant-${cue.quadrant}`, `region-${cue.region}`]"
        >
          <i v-for="dot in cue.region" :key="dot" class="mahjong-dot"></i>
        </span>
      </div>

      <div
        v-if="windEffects.length"
        class="board-wind-layer"
        :style="{
          '--wind-move-duration': `${WIND_MOVE_DURATION_MS}ms`,
          '--wind-hold-duration': `${WIND_HOLD_DURATION_MS}ms`
        }"
        aria-hidden="true"
        inert
      >
        <span
          v-for="effect in windEffects"
          :key="`${effect.step}-${effect.quadrant}`"
          class="quadrant-wind-effect"
          :class="[`quadrant-${effect.quadrant}`, `wind-${effect.direction}`]"
        >
          <span class="wind-sweep"></span>
        </span>
      </div>

      <div
        v-if="ready"
        class="board-actor-layer"
        :class="{ animating: animateActors }"
        :style="{ '--actor-move-duration': `${WIND_ACTOR_MOVE_DURATION_MS}ms` }"
        aria-hidden="true"
        inert
      >
        <span
          v-for="crystal in crystals"
          :key="`crystal-${crystal.q}`"
          class="board-actor crystal-actor"
          :style="actorStyle(toCellIndex(crystal.r, crystal.c))"
        >
          <CrystalMarker :orientation="crystal.o" />
        </span>
        <span
          v-for="actor in roleActors"
          :key="actor.role"
          class="board-actor role-actor"
          :style="actorStyle(actor.position, actor.offset)"
        >
          <RoleMarker
            :role="actor.role"
            :buff="question.buffs[actor.role]"
            :active="actor.role === focus"
          />
        </span>
      </div>

      <div v-if="windStep" class="wind-direction" aria-live="polite">
        {{ windStep === 1 ? '① 橫向吹風：泡泡移動' : '② 縱向吹風：泡泡移動' }}
      </div>
    </div>

    <div v-if="!ready" class="board-start">
      <div class="start-glyph" aria-hidden="true">◆</div>
      <button class="primary-button start-button" type="button" :disabled="!focus" @click="$emit('start')">
        ▶ 開始練習
      </button>
      <span>{{ focus ? `已選 ${focus}，點此開始` : '請先在右側選擇角色' }}</span>
    </div>

    <div v-else class="arena-caption">
      <span class="live-dot"></span>
      {{ phase === 0 ? '選擇排隊位置' : phase === 1 ? '選擇吹風前站位' : '吹風前站位已鎖定' }}
    </div>
  </div>
</template>
