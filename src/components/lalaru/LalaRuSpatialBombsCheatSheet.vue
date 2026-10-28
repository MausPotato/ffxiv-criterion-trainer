<script setup lang="ts">
import {
  LALARU_FIELD_SIZE,
  rotateSpatialPoint,
  spatialStandardPosition,
  type ArenaPoint,
  type SubtractionLayer
} from '../../mechanics/lalaru/index.ts';
import TrainerQuickReference from '../trainer/TrainerQuickReference.vue';

withDefaults(defineProps<{
  defaultOpen?: boolean;
}>(), {
  defaultOpen: false
});

const layers = [1, 2, 3, 4] as const;
const initialPositions = Object.fromEntries(layers.map(layer => [
  layer,
  spatialStandardPosition(layer, 0)
])) as Record<SubtractionLayer, ArenaPoint>;
const layerOneTarget = rotateSpatialPoint({ x: 2.5, y: 1.5 }, 0);
const layerFourTarget = rotateSpatialPoint({ x: 2.5, y: 4.5 }, 0);

function markerStyle(layer: SubtractionLayer): Record<string, string> {
  const point = initialPositions[layer];
  return {
    left: `${point.x / LALARU_FIELD_SIZE * 100}%`,
    top: `${point.y / LALARU_FIELD_SIZE * 100}%`,
    '--marker-offset-x': layer === 1 || layer === 3 ? '-13px' : '13px'
  };
}

function diagramCoordinate(value: number): number {
  return value / LALARU_FIELD_SIZE * 100;
}
</script>

<template>
  <TrainerQuickReference title="立體炸彈站位小抄" :default-open="defaultOpen">
    <div class="spatial-reference-layout">
      <div class="position-diagram" aria-label="立體炸彈相對方向的直向站位示意圖">
        <span v-for="cell in 25" :key="cell" class="diagram-cell"></span>
        <svg class="movement-lines" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <marker id="spatial-reference-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="context-stroke" />
            </marker>
          </defs>
          <line :x1="diagramCoordinate(initialPositions[1].x)" :y1="diagramCoordinate(initialPositions[1].y)" :x2="diagramCoordinate(layerOneTarget.x)" :y2="diagramCoordinate(layerOneTarget.y)" class="move-one" />
          <line :x1="diagramCoordinate(initialPositions[4].x)" :y1="diagramCoordinate(initialPositions[4].y)" :x2="diagramCoordinate(layerFourTarget.x)" :y2="diagramCoordinate(layerFourTarget.y)" class="move-four" />
        </svg>
        <span class="diagram-boss">王</span>
        <span
          v-for="layer in layers"
          :key="layer"
          class="layer-marker"
          :class="`layer-${layer}`"
          :style="markerStyle(layer)"
        >{{ layer }}</span>
        <span class="target-marker target-one" :style="{ left: `${layerOneTarget.x / LALARU_FIELD_SIZE * 100}%`, top: `${layerOneTarget.y / LALARU_FIELD_SIZE * 100}%` }">1</span>
        <span class="target-marker target-four" :style="{ left: `${layerFourTarget.x / LALARU_FIELD_SIZE * 100}%`, top: `${layerFourTarget.y / LALARU_FIELD_SIZE * 100}%` }">4</span>
      </div>

      <div class="reference-copy">
        <section>
          <h3>初始站位</h3>
          <p><strong>1、2：王腳下</strong><span>3、4：向後（題型後方）</span></p>
        </section>
        <section>
          <h3>後續處理</h3>
          <ul>
            <li><strong>2、3</strong><span>掛機（原位處理），不需額外移動</span></li>
            <li><strong>1</strong><span>步進 3 上方炸彈結算後移往題型上方</span></li>
            <li><strong>4</strong><span>步進 6 後剩 1 層，移往題型下方</span></li>
          </ul>
        </section>
      </div>
    </div>
    <p class="direction-note">圖示固定以題型上／下直向呈現；實際場地會隨路線旋轉，不受鏡頭或角色面向影響。</p>
  </TrainerQuickReference>
</template>

<style scoped>
.spatial-reference-layout { display: grid; grid-template-columns: minmax(112px, .82fr) minmax(0, 1.18fr); gap: 10px; align-items: center; }
.position-diagram { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); width: 100%; max-width: 150px; aspect-ratio: 1; overflow: hidden; border: 1px solid var(--control-border); border-radius: var(--radius-control); background: var(--surface-inset); }
.diagram-cell { border: 1px solid rgba(118, 158, 173, .18); }
.diagram-boss, .layer-marker, .target-marker { position: absolute; z-index: 3; display: grid; place-items: center; border-radius: 50%; transform: translate(-50%, -50%); }
.diagram-boss { left: 50%; top: 50%; z-index: 2; width: 29px; height: 29px; border: 2px solid #efc96d; color: #fff4c4; background: #403321; font-size: 10px; font-weight: 850; }
.layer-marker { width: 21px; height: 21px; border: 1px solid var(--control-border-selected); color: var(--text); background: var(--control-bg-selected); font: 850 11px ui-monospace, monospace; transform: translate(calc(-50% + var(--marker-offset-x)), -50%); box-shadow: 0 0 7px rgba(97, 212, 238, .32); }
.target-marker { z-index: 4; width: 18px; height: 18px; border: 1px dashed currentColor; background: rgba(8, 17, 24, .86); font: 800 9px ui-monospace, monospace; }
.target-one { color: var(--cyan); }.target-four { color: var(--gold); }
.movement-lines { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.movement-lines line { fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 4 3; marker-end: url(#spatial-reference-arrow); }
.move-one { color: var(--cyan); stroke: var(--cyan); }.move-four { color: var(--gold); stroke: var(--gold); }
.reference-copy { display: grid; gap: 8px; min-width: 0; }
.reference-copy section { display: grid; gap: 3px; }
.reference-copy h3 { margin: 0; color: var(--text); font-size: var(--type-secondary); line-height: var(--leading-compact); }
.reference-copy p, .reference-copy ul { margin: 0; color: var(--text-secondary); font-size: var(--type-micro); line-height: 1.45; }
.reference-copy p { display: grid; gap: 1px; }.reference-copy strong { color: #effcff; }
.reference-copy ul { display: grid; gap: 2px; padding: 0; list-style: none; }
.reference-copy li { display: grid; grid-template-columns: 24px 1fr; gap: 4px; }
.direction-note { margin: 0; color: var(--text-helper); font-size: var(--type-micro); line-height: 1.45; }

@media (max-width: 390px) {
  .spatial-reference-layout { grid-template-columns: 108px minmax(0, 1fr); gap: 8px; }
  .diagram-boss { width: 25px; height: 25px; }
  .layer-marker { width: 19px; height: 19px; }
}
</style>
