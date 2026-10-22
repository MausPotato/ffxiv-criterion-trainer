<script setup lang="ts">
import type { Role } from '../../domain/roles.ts';
import type { Buff } from '../../mechanics/ketuduke/types.ts';
import MechanicIcon from './MechanicIcon.vue';

defineProps<{
  role: Role;
  buff: Buff;
  active?: boolean;
}>();
</script>

<template>
  <span class="role-marker" :class="[buff, { active }]">
    <MechanicIcon :name="buff" />
    {{ role }}
  </span>
</template>
