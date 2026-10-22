<script setup lang="ts">
import { computed } from 'vue';
import type { CellIndex } from '../../domain/grid.ts';
import { ROLES, type PartialRoleMap, type Role } from '../../domain/roles.ts';
import type { KetudukeQuestion, TrainerPhase } from '../../mechanics/ketuduke/types.ts';
import { mahjongRegion } from '../../mechanics/ketuduke/queue.ts';
import CrystalMarker from './CrystalMarker.vue';
import RoleMarker from './RoleMarker.vue';

const props = defineProps<{
  question: KetudukeQuestion;
  ready: boolean;
  focus: Role | null;
  mahVisible: boolean;
  phase: TrainerPhase;
  interactive: boolean;
  queueCells: CellIndex[];
  positions?: PartialRoleMap<CellIndex>;
}>();

defineEmits<{
  start: [];
  selectCell: [cell: CellIndex];
}>();

const cells = computed(() => Array.from({ length: 16 }, (_, index) => {
  const r = Math.floor(index / 4);
  const c = index % 4;
  const crystal = props.ready
    ? props.question.crystals.find(item => item.r === r && item.c === c)
    : undefined;
  const roles = ROLES.filter(role => props.positions?.[role] === index);
  const mahjong = props.mahVisible ? mahjongRegion(props.question, r, c) : undefined;
  return { index, r, c, crystal, roles, mahjong };
}));
</script>

<template>
  <div class="arena-wrap">
    <div class="board" :class="{ inactive: !ready }">
      <button
        v-for="cell in cells"
        :key="cell.index"
        class="arena-tile"
        :class="{ 'queue-line': phase === 0 && queueCells.includes(cell.index), selected: cell.roles.length > 0 }"
        type="button"
        :aria-label="`第 ${cell.r + 1} 排第 ${cell.c + 1} 格`"
        :disabled="!interactive"
        @click="$emit('selectCell', cell.index)"
      >
        <CrystalMarker
          v-if="cell.crystal"
          :orientation="cell.crystal.o"
        />
        <RoleMarker
          v-for="role in cell.roles"
          :key="role"
          :role="role"
          :buff="question.buffs[role]"
          :active="role === focus"
        />
        <span v-if="cell.mahjong" class="mahjong-marker" :class="`region-${cell.mahjong}`">
          {{ cell.mahjong === 1 ? '① ↔' : '② ↕' }}
        </span>
      </button>
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
