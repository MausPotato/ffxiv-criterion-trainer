<script setup lang="ts">
import { MECHANIC_ICONS } from '../../assets/mechanic-icons.ts';
import type { PlanarPartyMember } from '../../mechanics/lalaru/index.ts';

defineProps<{
  member: PlanarPartyMember;
  remainingLayer: number;
  remainingSeconds: number;
  cameraRotation: number;
}>();

function layerIcon(layer: 1 | 2 | 3): string {
  return MECHANIC_ICONS[layer === 1
    ? 'subtractionOne'
    : layer === 2 ? 'subtractionTwo' : 'subtractionThree'];
}
</script>

<template>
  <div
    class="actor-debuff-strip"
    :style="{ '--debuff-counter-rotation': `${-cameraRotation}deg` }"
    aria-label="角色 Debuff"
  >
    <span class="debuff-icon">
      <img v-if="remainingLayer > 0" :src="layerIcon(remainingLayer as 1 | 2 | 3)" :alt="`減算炸彈 ${remainingLayer} 層`" />
      <b v-else class="cleared-layer">0</b>
    </span>
    <span v-if="member.explosionTarget" class="debuff-icon"><img :src="MECHANIC_ICONS.lalaruStack" alt="分攤目標" /></span>
    <span class="debuff-icon">
      <img
        :src="MECHANIC_ICONS[member.multiplier === 'III' ? 'multiplyIII' : 'multiplyV']"
        :alt="`旋轉角 ${member.multiplier}`"
      />
    </span>
    <span class="forward-debuff" title="移動命令：前">
      <span class="debuff-icon"><img :src="MECHANIC_ICONS.lalaruForward" alt="前進" /></span>
      <strong>{{ remainingSeconds }}</strong>
    </span>
  </div>
</template>

<style scoped>
.actor-debuff-strip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  z-index: 14;
  display: flex;
  height: 38px;
  align-items: flex-start;
  gap: 3px;
  transform: translateX(-50%) rotate(var(--debuff-counter-rotation));
  transform-origin: center top;
  white-space: nowrap;
  pointer-events: none;
}

.debuff-icon {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  place-items: center;
}

.debuff-icon img {
  display: block;
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.cleared-layer {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 1px solid #6de7b0;
  border-radius: 4px;
  color: #8cffc6;
  background: rgba(8, 43, 34, .88);
  font: 900 12px ui-monospace, monospace;
}

.forward-debuff {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.forward-debuff strong {
  color: #f5fbff;
  font: 900 10px/1 ui-monospace, monospace;
  text-shadow: 0 1px 3px #000, 0 0 3px #000;
}
</style>
