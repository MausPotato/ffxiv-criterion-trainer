<script setup lang="ts">
import { computed } from 'vue';
import { LALARU_TIMING } from '../../mechanics/lalaru/timing.ts';
import type { ArrowSide } from '../../mechanics/lalaru/types.ts';
import {
  countdownDotLayout,
  rightAngleMarkerPosition,
  ringRotationDegrees,
  ringTurnDirectionForArrowSide
} from '../../presentation/lalaru/rotation-cue.ts';

const props = defineProps<{
  arrowSide: ArrowSide;
  dotCount: number;
  animationKey: number;
  playing: boolean;
}>();

const dots = computed(() => countdownDotLayout(props.dotCount));
const ringTurnDirection = computed(() => ringTurnDirectionForArrowSide(props.arrowSide));
const rightAnglePath = computed(() => ({
  top: 'M 42 42 L 50 34 L 58 42',
  left: 'M 42 42 L 34 50 L 42 58',
  right: 'M 58 42 L 66 50 L 58 58'
})[rightAngleMarkerPosition(props.arrowSide, props.dotCount)]);
const rightAngleFillPath = computed(() => ({
  top: 'M 42 42 L 50 34 L 58 42 L 50 50 Z',
  left: 'M 42 42 L 34 50 L 42 58 L 50 50 Z',
  right: 'M 58 42 L 66 50 L 58 58 L 50 50 Z'
})[rightAngleMarkerPosition(props.arrowSide, props.dotCount)]);
</script>

<template>
  <div
    class="rotation-cue-icon"
    :aria-label="`旋轉提示圖示，箭頭位於${arrowSide === 'left' ? '左側' : '右側'}，圓環${ringTurnDirection === 'clockwise' ? '順時針' : '逆時針'}旋轉`"
    role="img"
  >
    <svg
      class="rotation-cue-svg"
      :class="{ playing }"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <g
        :key="animationKey"
        class="rotating-ring"
        :class="[`turn-${ringTurnDirection}`, { playing }]"
        :style="{
          '--ring-duration': `${LALARU_TIMING.ringRotationMs}ms`,
          '--ring-turn': `${ringRotationDegrees(ringTurnDirection)}deg`
        }"
      >
        <circle class="ring-halo" cx="50" cy="50" r="43" />
        <circle class="ring-core" cx="50" cy="50" r="40" />
        <path class="outside-triangle" d="M 50 -7 L 40 5 L 60 5 Z" />
      </g>
      <g class="mechanism-lines">
        <path class="right-angle-fill" :d="rightAngleFillPath" />
        <path d="M 24 24 L 76 76 M 76 24 L 24 76" />
        <path
          :key="`${arrowSide}-${dotCount}`"
          class="right-angle"
          :d="rightAnglePath"
        />
      </g>
      <g class="countdown-dots">
        <circle
          v-for="([cx, cy], index) in dots"
          :key="`${dotCount}-${index}`"
          :cx="cx"
          :cy="cy"
          r="6.5"
        />
      </g>
      <g v-if="arrowSide === 'left'" class="climbing-arrows left-arrows">
        <path class="arrow-step step-1" d="M 17 87 L 23 79 L 29 87" />
        <path class="arrow-step step-2" d="M 11 76 L 17 68 L 23 76" />
        <path class="arrow-step step-3" d="M 8 64 L 14 56 L 20 64" />
      </g>
      <g v-if="arrowSide === 'right'" class="climbing-arrows right-arrows">
        <path class="arrow-step step-1" d="M 83 87 L 77 79 L 71 87" />
        <path class="arrow-step step-2" d="M 89 76 L 83 68 L 77 76" />
        <path class="arrow-step step-3" d="M 92 64 L 86 56 L 80 64" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.rotation-cue-icon {
  width: 82px;
  height: 82px;
  filter: drop-shadow(0 0 10px rgba(255, 159, 51, .52));
}

.rotation-cue-svg { display: block; width: 100%; height: 100%; overflow: visible; }
.rotating-ring { transform-box: view-box; transform-origin: 50px 50px; }
.rotating-ring .ring-halo { fill: rgba(15, 13, 8, .72); stroke: rgba(255, 119, 25, .35); stroke-width: 8; }
.rotating-ring .ring-core { fill: none; stroke: #efa13d; stroke-width: 3; }
.rotating-ring .outside-triangle { fill: #f3a137; stroke: #ffd17a; stroke-width: 1.5; filter: drop-shadow(0 0 2px #ff7f20); }
.mechanism-lines { fill: none; stroke: rgba(242, 247, 238, .48); stroke-width: 1.5; stroke-linecap: round; }
.mechanism-lines .right-angle-fill { fill: rgba(243, 161, 55, .38); stroke: none; }
.mechanism-lines .right-angle { fill: none; stroke-linejoin: miter; }
.countdown-dots circle { fill: #fff; stroke: rgba(4, 7, 8, .96); stroke-width: 1.8; }
.climbing-arrows { fill: none; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; }
.left-arrows { color: #e44732; stroke: currentColor; }
.right-arrows { color: #35a9ff; stroke: currentColor; }
.arrow-step { opacity: .2; filter: drop-shadow(0 0 1px currentColor); }
.rotation-cue-svg.playing .arrow-step { animation: arrow-rise 1.05s ease-in-out infinite; }
.rotation-cue-svg.playing .step-1 { animation-delay: 0s; }
.rotation-cue-svg.playing .step-2 { animation-delay: .2s; }
.rotation-cue-svg.playing .step-3 { animation-delay: .4s; }
.rotating-ring.playing { animation: turn-ring var(--ring-duration) cubic-bezier(.36, .05, .22, 1) infinite; }

@keyframes turn-ring { from { transform: rotate(0); } to { transform: rotate(var(--ring-turn)); } }
@keyframes arrow-rise {
  0%, 18%, 100% { opacity: .18; }
  36%, 58% { opacity: 1; filter: drop-shadow(0 0 4px currentColor); }
  76% { opacity: .38; }
}

@media (prefers-reduced-motion: reduce) {
  .rotating-ring.playing { animation-timing-function: linear; }
}
</style>
