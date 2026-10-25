<script setup lang="ts">
defineProps<{ facingAngle: number }>();
</script>

<template>
  <span
    class="player-facing-indicator"
    :style="{ '--player-facing-angle': `${facingAngle}deg` }"
    aria-hidden="true"
  ><i></i></span>
</template>

<style scoped>
.player-facing-indicator {
  position: absolute;
  inset: -7px;
  z-index: 4;
  border-radius: 50%;
  transform: rotate(var(--player-facing-angle));
  pointer-events: none;
}
.player-facing-indicator i {
  position: absolute;
  top: -5px;
  left: 50%;
  width: 0;
  height: 0;
  border-right: 5px solid transparent;
  border-bottom: 9px solid #fff2a0;
  border-left: 5px solid transparent;
  filter: drop-shadow(0 0 3px #f4bf4e);
  transform: translateX(-50%);
}
</style>
