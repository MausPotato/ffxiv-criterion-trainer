<script setup lang="ts">
import { computed } from 'vue';
import { useArenaMarkers } from '../../composables/useArenaMarkers.ts';
import { formatGridCoordinate } from '../../domain/grid-coordinate-format.ts';
import type { CellIndex } from '../../domain/grid.ts';
import { ARENA_MARKERS, type ArenaMarkerDefinition } from '../../presentation/arena-markers.ts';

interface ArenaFloorCell {
  index: CellIndex;
  r: number;
  c: number;
  coordinateLabel: string;
}

const props = withDefaults(defineProps<{
  interactive?: boolean;
  inactive?: boolean;
  cellClass?: (cell: ArenaFloorCell) => string | Record<string, boolean>;
}>(), {
  interactive: false,
  inactive: false,
  cellClass: undefined
});

const emit = defineEmits<{
  selectCell: [cell: CellIndex];
}>();

const { showArenaMarkers } = useArenaMarkers();

const cells = computed<ArenaFloorCell[]>(() => Array.from({ length: 16 }, (_, index) => {
  const r = Math.floor(index / 4);
  const c = index % 4;
  return { index, r, c, coordinateLabel: formatGridCoordinate({ r, c }) };
}));

function markerStyle(marker: ArenaMarkerDefinition): Record<string, string> {
  return {
    left: `${marker.x / 4 * 100}%`,
    top: `${marker.y / 4 * 100}%`
  };
}
</script>

<template>
  <div class="board" :class="{ inactive }">
    <button
      v-for="cell in cells"
      :key="cell.index"
      class="arena-tile"
      :class="cellClass?.(cell)"
      type="button"
      :aria-label="cell.coordinateLabel"
      :disabled="!interactive"
      @click="emit('selectCell', cell.index)"
    ></button>
    <div v-if="showArenaMarkers" class="arena-ground-marker-layer" aria-hidden="true" inert>
      <span
        v-for="marker in ARENA_MARKERS"
        :key="marker.id"
        class="arena-ground-marker"
        :class="[`marker-${marker.id.toLowerCase()}`, marker.kind]"
        :style="markerStyle(marker)"
      >{{ marker.id }}</span>
    </div>
    <slot></slot>
  </div>
</template>
