<script setup lang="ts">
import type {
  ArenaPoint,
  SummonedDollsEventSpec,
  SummonedDollsFloorCell,
  SummonedDollsPartyId,
  SummonedDollsScenario
} from '../../mechanics/lalaru/index.ts';
import { SUMMONED_DOLLS_GRID_SIZE } from '../../mechanics/lalaru/index.ts';
import { LALARU_BOSS_DIAMETER } from '../../presentation/lalaru/actor-visuals.ts';
import { useLalaRuArenaInteraction } from '../../composables/useLalaRuArenaInteraction.ts';
import TrainerCameraControls from '../trainer/TrainerCameraControls.vue';
import TrainerStartOverlay from '../trainer/TrainerStartOverlay.vue';

const props = defineProps<{
  scenario: SummonedDollsScenario;
  floorCells: readonly SummonedDollsFloorCell[];
  currentEvent: SummonedDollsEventSpec | null;
  complete: boolean;
  selectedPlayerId: SummonedDollsPartyId;
  partyPositions: Readonly<Record<SummonedDollsPartyId, ArenaPoint>>;
  canMoveSelectedPlayer: boolean;
  evenExplosionActive: boolean;
  magicVulnerabilityTargetIds: readonly SummonedDollsPartyId[];
}>();

const emit = defineEmits<{
  start: [];
  updatePlayerPosition: [position: ArenaPoint];
}>();
const bossStyle = {
  width: `${LALARU_BOSS_DIAMETER / SUMMONED_DOLLS_GRID_SIZE * 100}%`
};

const {
  cameraViewport,
  dragging,
  cameraRotation,
  rotatingCamera,
  cameraStyle,
  beginPlayerDrag,
  movePlayer,
  endPlayerDrag,
  rotateCameraBy,
  beginCameraDrag,
  moveCamera,
  endCameraDrag,
  resetCamera
} = useLalaRuArenaInteraction({
  getPlayerPosition: () => props.partyPositions[props.selectedPlayerId],
  canMove: () => props.canMoveSelectedPlayer,
  canRotateCamera: () => props.currentEvent !== null,
  updatePlayerPosition: position => emit('updatePlayerPosition', position)
});

function cellStyle(cell: { row: number; col: number }): Record<string, string> {
  return { left: `${cell.col * 20}%`, top: `${cell.row * 20}%` };
}

function pointStyle(point: { x: number; y: number }): Record<string, string> {
  return { left: `${point.x / 5 * 100}%`, top: `${point.y / 5 * 100}%` };
}

function lineAoeStyle(doll: SummonedDollsScenario['configuration']['dolls'][number]): Record<string, string> {
  return props.scenario.configuration.dollSide === 'north'
    || props.scenario.configuration.dollSide === 'south'
    ? { top: '0', bottom: '0', left: `${doll.worldLane * 20}%`, width: '20%' }
    : { top: `${doll.worldLane * 20}%`, right: '0', bottom: 'auto', left: '0', height: '20%' };
}

function eventReached(id: SummonedDollsEventSpec['id']): boolean {
  if (!props.currentEvent) return false;
  return props.scenario.implementedEventIds.indexOf(props.currentEvent.id)
    >= props.scenario.implementedEventIds.indexOf(id);
}
</script>

<template>
  <div class="dolls-arena-shell">
    <div
      ref="cameraViewport"
      class="dolls-camera-viewport"
      :class="{ 'rotating-camera': rotatingCamera }"
      aria-label="召喚人偶 5 乘 5 場地；按住滑鼠右鍵水平拖曳可旋轉視角"
      @pointerdown="beginCameraDrag"
      @pointermove="moveCamera"
      @pointerup="endCameraDrag"
      @pointercancel="endCameraDrag"
      @contextmenu.prevent
    >
      <div class="dolls-arena" :style="cameraStyle">
      <div
        v-for="cell in floorCells"
        :key="`${cell.row}-${cell.col}`"
        class="floor-cell"
        :class="`state-${cell.state}`"
        :data-floor-state="cell.state"
        :data-floor-effects="cell.effects.map(effect => `${effect.source}:${effect.kind}`).join(',')"
        :style="cellStyle(cell)"
      >
        <span
          v-if="cell.effects.some(effect => effect.kind === 'pattern-step')"
          class="telegraph-mark"
          aria-hidden="true"
        ></span>
      </div>

      <template v-if="eventReached('gale-telegraph') && !eventReached('light-blast-floor')">
        <div
          v-for="doll in scenario.configuration.dolls"
          :key="`line-${doll.id}`"
          class="line-aoe"
          :class="{ resolved: eventReached('gale-impact') }"
          :style="lineAoeStyle(doll)"
          aria-hidden="true"
        ></div>
      </template>

      <div class="boss" :style="bossStyle" aria-label="拉拉魯，固定於中央並面向北方">
        <span class="boss-facing" aria-hidden="true"></span>
        <span class="actor-label" :style="{ '--counter-rotation': `${-cameraRotation}deg` }">拉拉魯</span>
      </div>

      <div
        v-for="member in scenario.party"
        :key="member.id"
        class="party-member"
        :class="[
          member.role,
          {
            dragging: dragging && member.id === selectedPlayerId,
            movable: canMoveSelectedPlayer && member.id === selectedPlayerId,
            'selected-player': member.id === selectedPlayerId
          }
        ]"
        :style="pointStyle(partyPositions[member.id])"
        :aria-label="`${member.label}${member.id === selectedPlayerId ? '，目前操作角色' : ''}`"
        @pointerdown.stop="member.id === selectedPlayerId && beginPlayerDrag($event)"
        @pointermove="movePlayer"
        @pointerup="endPlayerDrag"
        @pointercancel="endPlayerDrag"
      >
        <strong class="actor-label" :style="{ '--counter-rotation': `${-cameraRotation}deg` }">{{ member.label }}</strong>
        <span
          v-if="member.id === selectedPlayerId"
          class="player-tag"
          :style="{ '--counter-rotation': `${-cameraRotation}deg` }"
        >YOU</span>
        <span
          v-if="member.hasStackBuff && evenExplosionActive"
          class="stack-buff"
          :style="{ '--counter-rotation': `${-cameraRotation}deg` }"
          aria-label="分攤 BUFF"
        >分攤</span>
        <span
          v-if="eventReached('light-blast-markers') && !eventReached('light-blast-impact')"
          class="light-blast-marker"
          aria-label="光爆點名"
        ></span>
        <span
          v-if="magicVulnerabilityTargetIds.includes(member.id)"
          class="magic-vulnerability"
          :style="{ '--counter-rotation': `${-cameraRotation}deg` }"
        >易傷</span>
      </div>

      <div
        v-for="doll in eventReached('summon-dolls') ? scenario.configuration.dolls : []"
        :key="doll.id"
        class="doll"
        :style="pointStyle(doll.position)"
      >
        <span :style="{ '--counter-rotation': `${-cameraRotation}deg` }" aria-hidden="true">♟</span>
      </div>

      <span class="cardinal north" :style="{ '--counter-rotation': `${-cameraRotation}deg` }">N</span>
      <span class="cardinal east" :style="{ '--counter-rotation': `${-cameraRotation}deg` }">E</span>
      </div>

      <TrainerStartOverlay
        v-if="!currentEvent"
        description="開始後使用北側小怪與右下魔紋範例，逐步檢查烈風、路徑與光爆地板狀態。"
        @start="emit('start')"
      />
      <div v-if="complete" class="demo-complete">前半段展示完成</div>
    </div>

    <TrainerCameraControls
      class="camera-controls-shell"
      :rotation="cameraRotation"
      :visible="currentEvent !== null"
      @rotate="rotateCameraBy"
      @reset="resetCamera"
    />
    <p class="fixture-note">可配置展示流程｜步進路徑、攻擊相對時間與技能秒數尚待實機校正</p>
  </div>
</template>

<style scoped>
.dolls-arena-shell { display: grid; width: 100%; height: 100%; min-width: 0; min-height: 0; grid-template-rows: minmax(0, 1fr) auto auto; align-items: center; justify-items: center; gap: 7px; }
.dolls-camera-viewport { position: relative; width: min(80cqw, calc(80cqh - 96px), 620px); max-width: 80%; min-width: 0; aspect-ratio: 1; overflow: visible; border-radius: 15px; background: #09141d; cursor: grab; touch-action: none; }
.dolls-camera-viewport.rotating-camera { cursor: grabbing; }
.dolls-arena { position: absolute; inset: 0; overflow: visible; border: 2px solid #527285; border-radius: 15px; background: #172a32; box-shadow: inset 0 0 42px rgba(70, 143, 158, .14); container-type: inline-size; transform: rotate(var(--camera-rotation)); transform-origin: center; will-change: transform; }
.floor-cell { position: absolute; width: 20%; height: 20%; border: 1px solid rgba(138, 177, 183, .28); background: linear-gradient(135deg, rgba(69, 86, 75, .2), rgba(17, 34, 39, .2)); transition: background .2s ease, box-shadow .2s ease; }
.floor-cell.state-aoe-telegraph { background: rgba(116, 35, 45, .52); box-shadow: inset 0 0 16px rgba(255, 77, 83, .24); }
.floor-cell.state-movement-safe { background: rgba(28, 112, 91, .48); box-shadow: inset 0 0 0 2px rgba(110, 238, 184, .36); }
.floor-cell.state-pattern-step { background: rgba(167, 103, 34, .7); box-shadow: inset 0 0 0 2px rgba(255, 215, 111, .78), 0 0 14px rgba(255, 170, 57, .36); }
.floor-cell.state-pattern-danger { background: rgba(91, 52, 112, .7); box-shadow: inset 0 0 0 2px rgba(198, 137, 240, .36); }
.floor-cell.state-light-blast-lethal { background: rgba(137, 23, 40, .88); box-shadow: inset 0 0 0 3px rgba(255, 113, 123, .85), 0 0 16px rgba(255, 47, 67, .45); }
.telegraph-mark { position: absolute; inset: 24%; border: 2px solid #fff0a2; border-radius: 50%; }
.line-aoe { position: absolute; top: 0; bottom: 0; z-index: 3; border-right: 1px solid rgba(255, 126, 111, .55); border-left: 1px solid rgba(255, 126, 111, .55); background: repeating-linear-gradient(135deg, rgba(255, 87, 74, .16) 0 8px, rgba(255, 87, 74, .28) 8px 14px); pointer-events: none; }
.line-aoe.resolved { opacity: .22; }
.boss { position: absolute; top: 50%; left: 50%; z-index: 8; display: grid; aspect-ratio: 1; place-items: center; border: 3px solid #efc96d; border-radius: 50%; color: #fff4c4; background: radial-gradient(circle, #5c4932, #211b19 72%); font-size: clamp(9px, 1.5cqw, 14px); font-weight: 850; box-shadow: 0 0 0 4px rgba(239, 201, 109, .15), 0 0 22px rgba(0, 0, 0, .65); transform: translate(-50%, -50%); }
.boss-facing { position: absolute; top: -12px; left: 50%; width: 0; height: 0; border-right: 7px solid transparent; border-bottom: 11px solid #ffdb78; border-left: 7px solid transparent; transform: translateX(-50%); }
.actor-label { display: inline-block; transform: rotate(var(--counter-rotation)); }
.party-member { position: absolute; z-index: 12; display: grid; width: 8%; aspect-ratio: 1; place-items: center; border: 2px solid #72dcef; border-radius: 50%; color: white; background: #174e68; transform: translate(-50%, -50%); box-shadow: 0 0 0 4px rgba(91, 215, 239, .13); }
.party-member.healer { border-color: #67d989; background: #17643c; }.party-member.dps { border-color: #e66b74; background: #75313b; }.party-member strong { font-size: clamp(8px, 1.4cqw, 13px); }
.party-member.selected-player { z-index: 16; box-shadow: 0 0 0 2px #07131c, 0 0 0 5px #eafcff, 0 0 18px rgba(104, 220, 244, .8); }
.party-member.movable { cursor: grab; touch-action: none; }.party-member.dragging { cursor: grabbing; }
.player-tag { position: absolute; right: 50%; bottom: -17px; padding: 1px 5px; border: 1px solid #bdefff; border-radius: 999px; color: #eafcff; background: #164b5c; font: 800 clamp(7px, 1.2cqw, 10px) ui-monospace, monospace; transform: translateX(50%) rotate(var(--counter-rotation)); }
.stack-buff { position: absolute; top: -18px; padding: 2px 5px; border: 1px solid #d7b3ff; border-radius: 4px; color: #f2dcff; background: #563777; font-size: clamp(7px, 1.1cqw, 10px); white-space: nowrap; transform: rotate(var(--counter-rotation)); }
.light-blast-marker { position: absolute; z-index: -1; width: 260%; aspect-ratio: 1; border: 2px solid rgba(255, 196, 98, .9); border-radius: 50%; background: rgba(255, 143, 45, .1); box-shadow: 0 0 10px rgba(255, 158, 55, .52); pointer-events: none; }
.magic-vulnerability { position: absolute; right: -10px; bottom: -19px; padding: 1px 4px; border: 1px solid #ff9bba; border-radius: 4px; color: #ffd7e3; background: #712843; font-size: clamp(7px, 1.1cqw, 10px); transform: rotate(var(--counter-rotation)); white-space: nowrap; }
.doll { position: absolute; z-index: 14; display: grid; width: 6%; aspect-ratio: 1; place-items: center; border: 1px solid #d5b0ff; border-radius: 50%; color: #f3e8ff; background: #4a2d61; box-shadow: 0 0 9px rgba(189, 125, 255, .55); transform: translate(-50%, -50%); }
.doll span { font-size: clamp(10px, 2.3cqw, 20px); line-height: 1; transform: rotate(var(--counter-rotation)); }
.cardinal { position: absolute; z-index: 20; color: #d8f0f5; font: 800 12px ui-monospace, monospace; }.cardinal.north { top: 7px; left: 50%; transform: translateX(-50%) rotate(var(--counter-rotation)); }.cardinal.east { top: 50%; right: 8px; transform: translateY(-50%) rotate(var(--counter-rotation)); }
.demo-complete { position: absolute; bottom: 12px; left: 50%; z-index: 25; padding: 7px 14px; border: 1px solid #68d6a0; border-radius: 999px; color: #aaf0c9; background: rgba(7, 40, 31, .9); font-weight: 800; transform: translateX(-50%); white-space: nowrap; }
.fixture-note { max-width: 100%; margin: 0; overflow-wrap: anywhere; color: var(--text-helper); font-size: var(--type-helper); text-align: center; }
@media (max-width: 760px) {
  .dolls-arena-shell { height: auto; }
  .dolls-camera-viewport { width: 80%; max-width: 80%; }
  .camera-controls-shell { width: 100%; }
}
</style>
