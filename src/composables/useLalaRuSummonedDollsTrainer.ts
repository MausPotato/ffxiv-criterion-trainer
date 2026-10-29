import { computed, getCurrentScope, onScopeDispose, reactive, ref } from 'vue';
import {
  createSummonedDollsScenario,
  summonedDollsFloorAtEvent,
  type ArenaPoint,
  type SummonedDollsEventId,
  type SummonedDollsPartyId
} from '../mechanics/lalaru/index.ts';

type PartyPositions = Record<SummonedDollsPartyId, ArenaPoint>;
export type SummonedDollsTrainerMode = 'tutorial' | 'battle';

export function useLalaRuSummonedDollsTrainer(random: () => number = Math.random) {
  const scenario = reactive(createSummonedDollsScenario(random));
  const activeEventIndex = ref(-1);
  const attempts = ref(0);
  const mode = ref<SummonedDollsTrainerMode>('tutorial');
  const selectedPlayerId = ref<SummonedDollsPartyId>('tank');
  const lightBlastSnapshot = ref<PartyPositions | null>(null);
  const patternStepIndex = ref(0);
  const initialPartyPositions = Object.fromEntries(
    scenario.party.map(member => [member.id, { ...member.position }])
  ) as PartyPositions;
  const partyPositions = ref<PartyPositions>(clonePartyPositions(initialPartyPositions));
  const implementedEvents = scenario.events.filter(event => event.implemented);
  let patternStepTimer: ReturnType<typeof setTimeout> | null = null;
  const currentEvent = computed(() => implementedEvents[activeEventIndex.value] ?? null);
  const currentEventId = computed<SummonedDollsEventId | null>(() => currentEvent.value?.id ?? null);
  const floorCells = computed(() => summonedDollsFloorAtEvent(
    currentEventId.value,
    scenario,
    lightBlastSnapshot.value,
    patternStepIndex.value
  ));
  const started = computed(() => activeEventIndex.value >= 0);
  const complete = computed(() => activeEventIndex.value === implementedEvents.length - 1);
  const canAdvance = computed(() => started.value && !complete.value);
  const progress = computed(() => started.value
    ? ((activeEventIndex.value + 1) / implementedEvents.length) * 100
    : 0);
  const selectedPlayer = computed(() =>
    scenario.party.find(member => member.id === selectedPlayerId.value)!);
  const canMoveSelectedPlayer = computed(() => {
    const markerIndex = scenario.implementedEventIds.indexOf('spread-for-light-blast');
    const snapshotIndex = scenario.implementedEventIds.indexOf('light-blast-snapshot');
    return activeEventIndex.value >= markerIndex && activeEventIndex.value < snapshotIndex;
  });
  const patternStepProgress = computed(() => ({
    current: patternStepIndex.value + 1,
    total: scenario.pattern.stepSnapshots.length
  }));
  const evenExplosionActive = computed(() => eventReached('even-explosion-status'));
  const magicVulnerabilityTargetIds = computed<readonly SummonedDollsPartyId[]>(() =>
    eventReached('magic-vulnerability') ? scenario.party.map(member => member.id) : []);

  function clonePartyPositions(positions: PartyPositions): PartyPositions {
    return Object.fromEntries(
      Object.entries(positions).map(([id, position]) => [id, { ...position }])
    ) as PartyPositions;
  }

  function eventReached(id: SummonedDollsEventId): boolean {
    const index = scenario.implementedEventIds.indexOf(id);
    return index >= 0 && activeEventIndex.value >= index;
  }

  function selectPlayer(id: SummonedDollsPartyId): void {
    if (!scenario.party.some(member => member.id === id)) return;
    const previousId = selectedPlayerId.value;
    selectedPlayerId.value = id;
    if (mode.value === 'battle' && canMoveSelectedPlayer.value && previousId !== id) {
      partyPositions.value = {
        ...partyPositions.value,
        [previousId]: { ...scenario.spreadPositions[previousId] },
        [id]: { ...initialPartyPositions[id] }
      };
    }
  }

  function setMode(nextMode: SummonedDollsTrainerMode): void {
    if (started.value) return;
    mode.value = nextMode;
  }

  function setSelectedPlayerPosition(position: ArenaPoint): void {
    if (!canMoveSelectedPlayer.value) return;
    partyPositions.value = {
      ...partyPositions.value,
      [selectedPlayerId.value]: { ...position }
    };
  }

  function resetAttemptState(): void {
    clearPatternStepTimer();
    lightBlastSnapshot.value = null;
    patternStepIndex.value = 0;
    partyPositions.value = clonePartyPositions(initialPartyPositions);
  }

  function clearPatternStepTimer(): void {
    if (patternStepTimer !== null) clearTimeout(patternStepTimer);
    patternStepTimer = null;
  }

  function schedulePatternStep(): void {
    clearPatternStepTimer();
    if (currentEventId.value !== 'changing-pattern-step'
      || patternStepIndex.value >= scenario.pattern.stepSnapshots.length - 1) return;
    patternStepTimer = setTimeout(() => {
      patternStepTimer = null;
      patternStepIndex.value += 1;
      schedulePatternStep();
    }, scenario.pattern.displayStepMs);
  }

  function rerollScenario(): void {
    Object.assign(scenario, createSummonedDollsScenario(random));
  }

  function enterEvent(index: number): void {
    clearPatternStepTimer();
    activeEventIndex.value = index;
    if (currentEventId.value === 'changing-pattern-starts') patternStepIndex.value = 0;
    if (currentEventId.value === 'changing-pattern-step') {
      patternStepIndex.value = 1;
      schedulePatternStep();
    }
    if (currentEventId.value === 'spread-for-light-blast') {
      partyPositions.value = Object.fromEntries(scenario.party.map(member => [
        member.id,
        mode.value === 'battle' && member.id === selectedPlayerId.value
          ? { ...partyPositions.value[member.id] }
          : { ...scenario.spreadPositions[member.id] }
      ])) as PartyPositions;
    }
    if (currentEventId.value === 'light-blast-snapshot') {
      lightBlastSnapshot.value = clonePartyPositions(partyPositions.value);
    }
  }

  function start(): void {
    if (attempts.value > 0) rerollScenario();
    attempts.value += 1;
    resetAttemptState();
    enterEvent(0);
  }

  function advance(): void {
    if (!canAdvance.value) return;
    if (currentEventId.value === 'changing-pattern-step'
      && patternStepIndex.value < scenario.pattern.stepSnapshots.length - 1) {
      patternStepIndex.value += 1;
      schedulePatternStep();
      return;
    }
    enterEvent(activeEventIndex.value + 1);
  }

  function restart(): void {
    rerollScenario();
    attempts.value += 1;
    resetAttemptState();
    enterEvent(0);
  }

  function reset(): void {
    resetAttemptState();
    activeEventIndex.value = -1;
  }

  if (getCurrentScope()) onScopeDispose(clearPatternStepTimer);

  return {
    scenario,
    mode,
    activeEventIndex,
    currentEvent,
    floorCells,
    partyPositions,
    lightBlastSnapshot,
    patternStepIndex,
    patternStepProgress,
    started,
    complete,
    canAdvance,
    canMoveSelectedPlayer,
    progress,
    attempts,
    selectedPlayerId,
    selectedPlayer,
    evenExplosionActive,
    magicVulnerabilityTargetIds,
    selectPlayer,
    setMode,
    setSelectedPlayerPosition,
    start,
    advance,
    restart,
    reset
  };
}
