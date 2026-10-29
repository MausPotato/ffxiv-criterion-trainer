import { computed, ref } from 'vue';
import {
  createFixedSummonedDollsScenario,
  summonedDollsFloorAtEvent,
  type SummonedDollsEventId,
  type SummonedDollsPartyId
} from '../mechanics/lalaru/index.ts';

export function useLalaRuSummonedDollsTrainer() {
  const scenario = createFixedSummonedDollsScenario();
  const activeEventIndex = ref(-1);
  const attempts = ref(0);
  const selectedPlayerId = ref<SummonedDollsPartyId>('tank');
  const implementedEvents = scenario.events.filter(event => event.implemented);
  const currentEvent = computed(() => implementedEvents[activeEventIndex.value] ?? null);
  const currentEventId = computed<SummonedDollsEventId | null>(() => currentEvent.value?.id ?? null);
  const floorCells = computed(() => summonedDollsFloorAtEvent(currentEventId.value, scenario));
  const started = computed(() => activeEventIndex.value >= 0);
  const complete = computed(() => activeEventIndex.value === implementedEvents.length - 1);
  const canAdvance = computed(() => started.value && !complete.value);
  const progress = computed(() => started.value
    ? ((activeEventIndex.value + 1) / implementedEvents.length) * 100
    : 0);
  const selectedPlayer = computed(() =>
    scenario.party.find(member => member.id === selectedPlayerId.value)!);

  function selectPlayer(id: SummonedDollsPartyId): void {
    if (!scenario.party.some(member => member.id === id)) return;
    selectedPlayerId.value = id;
  }

  function start(): void {
    attempts.value += 1;
    activeEventIndex.value = 0;
  }

  function advance(): void {
    if (canAdvance.value) activeEventIndex.value += 1;
  }

  function restart(): void {
    attempts.value += 1;
    activeEventIndex.value = 0;
  }

  function reset(): void {
    activeEventIndex.value = -1;
  }

  return {
    scenario,
    activeEventIndex,
    currentEvent,
    floorCells,
    started,
    complete,
    canAdvance,
    progress,
    attempts,
    selectedPlayerId,
    selectedPlayer,
    selectPlayer,
    start,
    advance,
    restart,
    reset
  };
}
