<script setup lang="ts">
import type {
  SummonedDollsEventSpec,
  SummonedDollsFloorCell,
  SummonedDollsPartyId,
  SummonedDollsScenario
} from '../../mechanics/lalaru/index.ts';
import { SUMMONED_DOLLS_GRID_SIZE } from '../../mechanics/lalaru/index.ts';
import { LALARU_BOSS_DIAMETER } from '../../presentation/lalaru/actor-visuals.ts';
import TrainerStartOverlay from '../trainer/TrainerStartOverlay.vue';

const props = defineProps<{
  scenario: SummonedDollsScenario;
  floorCells: readonly SummonedDollsFloorCell[];
  currentEvent: SummonedDollsEventSpec | null;
  complete: boolean;
  selectedPlayerId: SummonedDollsPartyId;
}>();

const emit = defineEmits<{ start: [] }>();
const bossStyle = {
  width: `${LALARU_BOSS_DIAMETER / SUMMONED_DOLLS_GRID_SIZE * 100}%`
};

function cellStyle(cell: { row: number; col: number }): Record<string, string> {
  return { left: `${cell.col * 20}%`, top: `${cell.row * 20}%` };
}

function pointStyle(point: { x: number; y: number }): Record<string, string> {
  return { left: `${point.x / 5 * 100}%`, top: `${point.y / 5 * 100}%` };
}

function eventReached(id: SummonedDollsEventSpec['id']): boolean {
  if (!props.currentEvent) return false;
  return props.scenario.implementedEventIds.indexOf(props.currentEvent.id)
    >= props.scenario.implementedEventIds.indexOf(id);
}
</script>

<template>
  <div class="dolls-arena-shell">
    <div class="dolls-arena-stage">
      <div class="dolls-arena" aria-label="召喚人偶 5 乘 5 場地">
      <div
        v-for="cell in floorCells"
        :key="`${cell.row}-${cell.col}`"
        class="floor-cell"
        :class="`state-${cell.state}`"
        :data-floor-state="cell.state"
        :style="cellStyle(cell)"
      >
        <span v-if="cell.state === 'telegraph'" class="telegraph-mark" aria-hidden="true"></span>
      </div>

      <template v-if="eventReached('line-aoe')">
        <div
          v-for="doll in scenario.configuration.dolls"
          :key="`line-${doll.id}`"
          class="line-aoe"
          :class="{ resolved: complete }"
          :style="scenario.configuration.dollSide === 'north' || scenario.configuration.dollSide === 'south'
            ? { left: `${doll.worldLane * 20}%`, width: '20%' }
            : { top: `${doll.worldLane * 20}%`, height: '20%' }"
          aria-hidden="true"
        ></div>
      </template>

      <div class="boss" :style="bossStyle" aria-label="拉拉魯，固定於中央並面向北方">
        <span class="boss-facing" aria-hidden="true"></span>
        <span>拉拉魯</span>
      </div>

      <div
        v-for="member in scenario.party"
        :key="member.id"
        class="party-member"
        :class="[member.role, { 'selected-player': member.id === selectedPlayerId }]"
        :style="pointStyle(member.position)"
        :aria-label="`${member.label}${member.id === selectedPlayerId ? '，目前操作角色' : ''}`"
      >
        <strong>{{ member.label }}</strong>
        <span v-if="member.id === selectedPlayerId" class="player-tag">YOU</span>
        <span v-if="member.hasStackBuff" class="stack-buff" aria-label="分攤 BUFF">分攤</span>
      </div>

      <div
        v-for="doll in currentEvent ? scenario.configuration.dolls : []"
        :key="doll.id"
        class="doll"
        :style="pointStyle(doll.position)"
      >
        <span aria-hidden="true">♟</span>
        <small>{{ doll.localLane + 1 }}</small>
      </div>

      <span class="cardinal north">N</span>
      <span class="cardinal east">E</span>
      <div v-if="complete" class="demo-complete">前半段展示完成</div>

      <TrainerStartOverlay
        v-if="!currentEvent"
        description="使用北側固定配置，逐步檢查三條直線 AOE 與地板狀態。"
        @start="emit('start')"
      />
      </div>
    </div>
    <p class="fixture-note">展示 fixture｜路徑與時間尚待實機資料校正</p>
  </div>
</template>

<style scoped>
.dolls-arena-shell { display: grid; width: 100%; height: 100%; min-width: 0; min-height: 0; padding: clamp(52px, 10cqh, 72px) 4px 0; grid-template-rows: minmax(0, 1fr) auto; align-items: center; justify-items: center; gap: 7px; }
.dolls-arena-stage { position: relative; width: min(100cqw, calc(100cqh - 106px), 620px); max-width: 100%; min-width: 0; aspect-ratio: 1; }
.dolls-arena { position: absolute; inset: 0; overflow: visible; border: 2px solid #527285; border-radius: 15px; background: #172a32; box-shadow: inset 0 0 42px rgba(70, 143, 158, .14); container-type: inline-size; }
.floor-cell { position: absolute; width: 20%; height: 20%; border: 1px solid rgba(138, 177, 183, .28); background: linear-gradient(135deg, rgba(69, 86, 75, .2), rgba(17, 34, 39, .2)); transition: background .2s ease, box-shadow .2s ease; }
.floor-cell.state-danger { background: rgba(116, 35, 45, .62); box-shadow: inset 0 0 16px rgba(255, 77, 83, .28); }
.floor-cell.state-temporary-safe { background: rgba(28, 112, 91, .58); box-shadow: inset 0 0 0 2px rgba(110, 238, 184, .45); }
.floor-cell.state-telegraph { background: rgba(167, 103, 34, .7); box-shadow: inset 0 0 0 2px rgba(255, 215, 111, .78), 0 0 14px rgba(255, 170, 57, .36); }
.floor-cell.state-resolved { background: rgba(62, 57, 75, .76); box-shadow: inset 0 0 0 2px rgba(173, 158, 197, .35); }
.telegraph-mark { position: absolute; inset: 24%; border: 2px solid #fff0a2; border-radius: 50%; }
.line-aoe { position: absolute; top: 0; bottom: 0; z-index: 3; border-right: 1px solid rgba(255, 126, 111, .55); border-left: 1px solid rgba(255, 126, 111, .55); background: repeating-linear-gradient(135deg, rgba(255, 87, 74, .16) 0 8px, rgba(255, 87, 74, .28) 8px 14px); pointer-events: none; }
.line-aoe.resolved { opacity: .22; }
.boss { position: absolute; top: 50%; left: 50%; z-index: 8; display: grid; aspect-ratio: 1; place-items: center; border: 3px solid #efc96d; border-radius: 50%; color: #fff4c4; background: radial-gradient(circle, #5c4932, #211b19 72%); font-size: clamp(9px, 1.5cqw, 14px); font-weight: 850; box-shadow: 0 0 0 4px rgba(239, 201, 109, .15), 0 0 22px rgba(0, 0, 0, .65); transform: translate(-50%, -50%); }
.boss-facing { position: absolute; top: -12px; left: 50%; width: 0; height: 0; border-right: 7px solid transparent; border-bottom: 11px solid #ffdb78; border-left: 7px solid transparent; transform: translateX(-50%); }
.party-member { position: absolute; z-index: 12; display: grid; width: 8%; aspect-ratio: 1; place-items: center; border: 2px solid #72dcef; border-radius: 50%; color: white; background: #174e68; transform: translate(-50%, -50%); box-shadow: 0 0 0 4px rgba(91, 215, 239, .13); }
.party-member.healer { border-color: #67d989; background: #17643c; }.party-member.dps { border-color: #e66b74; background: #75313b; }.party-member strong { font-size: clamp(8px, 1.4cqw, 13px); }
.party-member.selected-player { z-index: 16; box-shadow: 0 0 0 2px #07131c, 0 0 0 5px #eafcff, 0 0 18px rgba(104, 220, 244, .8); }
.player-tag { position: absolute; right: 50%; bottom: -17px; padding: 1px 5px; border: 1px solid #bdefff; border-radius: 999px; color: #eafcff; background: #164b5c; font: 800 clamp(7px, 1.2cqw, 10px) ui-monospace, monospace; transform: translateX(50%); }
.stack-buff { position: absolute; top: -18px; padding: 2px 5px; border: 1px solid #d7b3ff; border-radius: 4px; color: #f2dcff; background: #563777; font-size: clamp(7px, 1.1cqw, 10px); white-space: nowrap; }
.doll { position: absolute; z-index: 14; display: grid; width: 11%; aspect-ratio: 1; place-items: center; border: 2px solid #c692ff; border-radius: 12px; color: #f3e8ff; background: linear-gradient(#603b78, #271e37); box-shadow: 0 0 14px rgba(189, 125, 255, .6); transform: translate(-50%, -50%); }
.doll span { font-size: clamp(22px, 4cqw, 38px); line-height: .7; }.doll small { font: 700 9px ui-monospace, monospace; }
.cardinal { position: absolute; z-index: 20; color: #d8f0f5; font: 800 12px ui-monospace, monospace; }.cardinal.north { top: 7px; left: 50%; }.cardinal.east { top: 50%; right: 8px; }
.demo-complete { position: absolute; bottom: 12px; left: 50%; z-index: 25; padding: 7px 14px; border: 1px solid #68d6a0; border-radius: 999px; color: #aaf0c9; background: rgba(7, 40, 31, .9); font-weight: 800; transform: translateX(-50%); white-space: nowrap; }
.fixture-note { max-width: 100%; margin: 0; overflow-wrap: anywhere; color: var(--text-helper); font-size: var(--type-helper); text-align: center; }
@media (max-width: 760px) {
  .dolls-arena-shell { height: auto; padding: clamp(48px, 12vw, 68px) 0 0; }
  .dolls-arena-stage { width: 100%; }
}
</style>
