<script setup lang="ts">
import { MECHANIC_ICONS, type MechanicIconName } from '../../assets/mechanic-icons.ts';

defineProps<{
  name: MechanicIconName;
  alt?: string;
}>();
</script>

<template>
  <img class="mechanic-icon" :src="MECHANIC_ICONS[name]" :alt="alt ?? ''">
</template>
