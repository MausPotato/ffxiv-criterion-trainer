<script setup lang="ts">
import { formatCellCoordinate } from '../../domain/grid-coordinate-format.ts';
import type { SettlementState } from '../../composables/useKetudukeTrainer.ts';
import type { PartyMechanic } from '../../mechanics/ketuduke/types.ts';

defineProps<{
  settlement: SettlementState;
  party: PartyMechanic;
}>();
</script>

<template>
  <section class="settlement-card" aria-live="polite">
    <div class="settlement-heading">
      <span>WIND RESULT</span>
      <strong :class="settlement.valid ? 'success' : 'warning'">
        {{ settlement.valid ? '結算通過' : '模擬警告' }}
      </strong>
    </div>
    <p>{{ settlement.summary }}</p>
    <dl>
      <div>
        <dt>個人落點</dt>
        <dd>{{ formatCellCoordinate(settlement.personalPosition) }} · {{ settlement.personalSafe ? '安全' : '推算為危險' }}</dd>
      </div>
      <div>
        <dt>{{ party }}</dt>
        <dd>{{ settlement.groupDetail }}</dd>
      </div>
      <div>
        <dt>全隊安全格</dt>
        <dd>{{ settlement.allPlayersSafe ? '四人皆在安全格' : '有角色不在安全格' }}</dd>
      </div>
    </dl>
    <p class="settlement-limit"><strong>目前屬測試模型：</strong>{{ settlement.limitation }}</p>
  </section>
</template>
