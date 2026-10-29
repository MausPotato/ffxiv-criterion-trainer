import { computed, getCurrentScope, onScopeDispose, reactive, ref } from 'vue';
import {
  createSummonedDollsShiftPlan,
  createSummonedDollsScenario,
  evaluateSummonedDollsEnumeration,
  summonedDollsFloorAtEvent,
  type ArenaPoint,
  type SummonedDollsEventId,
  type SummonedDollsEnumerationCircle,
  type SummonedDollsEnumerationPhase,
  type SummonedDollsEnumerationResult,
  type SummonedDollsEnumerationSnapshot,
  type SummonedDollsMagicBurstCircle,
  type SummonedDollsMagicBurstCirclePhase,
  type SummonedDollsMagicBurstPhase,
  type SummonedDollsMagicBurstSnapshot,
  type SummonedDollsPartyId,
  type SummonedDollsShiftPhase
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
  const shiftStartPositions = ref<PartyPositions | null>(null);
  const magicBurstStartPositions = ref<PartyPositions | null>(null);
  const magicBurstSnapshot = ref<SummonedDollsMagicBurstSnapshot | null>(null);
  const enumerationSnapshot = ref<SummonedDollsEnumerationSnapshot | null>(null);
  const enumerationResult = ref<SummonedDollsEnumerationResult | null>(null);
  const patternStepIndex = ref(0);
  const initialPartyPositions = Object.fromEntries(
    scenario.party.map(member => [member.id, { ...member.position }])
  ) as PartyPositions;
  const partyPositions = ref<PartyPositions>(clonePartyPositions(initialPartyPositions));
  const implementedEvents = scenario.events.filter(event => event.implemented);
  let patternStepTimer: ReturnType<typeof setTimeout> | null = null;
  let shiftDisplayTimer: ReturnType<typeof setTimeout> | null = null;
  const currentEvent = computed(() => implementedEvents[activeEventIndex.value] ?? null);
  const currentEventId = computed<SummonedDollsEventId | null>(() => currentEvent.value?.id ?? null);
  const shiftPlan = computed(() => {
    if (!shiftStartPositions.value) return null;
    const resolvedFloor = summonedDollsFloorAtEvent(
      'prepare-shift', scenario, lightBlastSnapshot.value, patternStepIndex.value
    );
    return createSummonedDollsShiftPlan(scenario, shiftStartPositions.value, resolvedFloor);
  });
  const shiftPhase = computed<SummonedDollsShiftPhase>(() => {
    if (eventReached('prepare-magic-burst')) return 'prepare-magic-burst';
    if (eventReached('shift-complete')) return 'complete';
    if (eventReached('shift-to-former-aoe')) return 'moving';
    if (eventReached('shift-ready')) return 'ready';
    if (eventReached('light-blast-floor')) return 'floor-resolved';
    return 'locked-before-gale';
  });
  const magicBurstPhase = computed<SummonedDollsMagicBurstPhase>(() => {
    if (eventReached('enumeration-stack-snapshot')) return 'complete';
    if (eventReached('magic-burst-second-impact')) return 'second-impact';
    if (eventReached('magic-burst-evacuation')) return 'evacuation';
    if (eventReached('magic-burst-second-telegraph')) return 'second-telegraph';
    if (eventReached('magic-burst-vulnerability')) return 'vulnerability';
    if (eventReached('magic-burst-first-impact')) return 'first-impact';
    if (eventReached('magic-burst-snapshot')) return 'snapshot';
    if (eventReached('magic-burst-positioning')) return 'positioning';
    if (eventReached('magic-burst-targets')) return 'targets';
    if (eventReached('magic-burst-cast')) return 'cast';
    return 'inactive';
  });
  const magicBurstCircles = computed<readonly SummonedDollsMagicBurstCircle[]>(() => {
    let positions: PartyPositions | null = null;
    let phase: SummonedDollsMagicBurstCirclePhase | null = null;
    if (magicBurstPhase.value === 'targets' || magicBurstPhase.value === 'positioning') {
      positions = partyPositions.value;
      phase = 'tracking';
    } else if (magicBurstPhase.value === 'snapshot') {
      positions = magicBurstSnapshot.value?.positions ?? null;
      phase = 'snapshot';
    } else if (magicBurstPhase.value === 'first-impact'
      || magicBurstPhase.value === 'vulnerability') {
      positions = magicBurstSnapshot.value?.positions ?? null;
      phase = 'first-impact';
    } else if (magicBurstPhase.value === 'second-telegraph'
      || magicBurstPhase.value === 'evacuation') {
      positions = magicBurstSnapshot.value?.positions ?? null;
      phase = 'second-telegraph';
    } else if (magicBurstPhase.value === 'second-impact') {
      positions = magicBurstSnapshot.value?.positions ?? null;
      phase = 'second-impact';
    }
    if (!positions || !phase) return [];
    return scenario.party.map(member => ({
      sourceId: member.id,
      position: { ...positions[member.id] },
      radius: scenario.magicBurst.displayRadius,
      radiusConfirmed: false,
      phase
    }));
  });
  const enumerationPhase = computed<SummonedDollsEnumerationPhase>(() => {
    if (eventReached('mechanic-finished')) return 'finished';
    if (eventReached('enumeration-stack-resolved')) return 'resolved';
    if (eventReached('enumeration-stack-impact')) return 'impact';
    if (eventReached('enumeration-stack-snapshot')) return 'snapshot';
    if (eventReached('enumeration-stack-ready')) return 'ready';
    return 'inactive';
  });
  const enumerationCircles = computed<readonly SummonedDollsEnumerationCircle[]>(() => {
    if (enumerationPhase.value === 'inactive'
      || enumerationPhase.value === 'resolved'
      || enumerationPhase.value === 'finished') return [];
    const positions = enumerationSnapshot.value?.positions ?? partyPositions.value;
    const phase = enumerationPhase.value === 'impact'
      ? 'impact'
      : enumerationPhase.value === 'snapshot' ? 'snapshot' : 'ready';
    return scenario.magicBurst.enumerationGroups.map(group => {
      const sourceId = group.find(id =>
        scenario.party.find(member => member.id === id)?.hasStackBuff
      ) as 'dps-melee' | 'dps-ranged';
      return {
        sourceId,
        position: { ...positions[sourceId] },
        radius: scenario.magicBurst.enumerationDisplayRadius,
        radiusConfirmed: false,
        phase
      };
    });
  });
  const movementCandidates = computed(() => {
    if (!eventReached('shift-ready') || !shiftPlan.value) return [];
    return [...new Map(Object.values(shiftPlan.value.candidates).flat()
      .map(candidate => [
        `${candidate.cell.row}-${candidate.cell.col}`,
        candidate.position
      ])).values()];
  });
  const floorCells = computed(() => summonedDollsFloorAtEvent(
    currentEventId.value,
    scenario,
    lightBlastSnapshot.value,
    patternStepIndex.value,
    movementCandidates.value
  ));
  const started = computed(() => activeEventIndex.value >= 0);
  const complete = computed(() => activeEventIndex.value === implementedEvents.length - 1);
  const canAdvance = computed(() => started.value && !complete.value
    && !(mode.value === 'tutorial' && currentEventId.value === 'shift-to-former-aoe'));
  const progress = computed(() => started.value
    ? ((activeEventIndex.value + 1) / implementedEvents.length) * 100
    : 0);
  const selectedPlayer = computed(() =>
    scenario.party.find(member => member.id === selectedPlayerId.value)!);
  const canMoveSelectedPlayer = computed(() => {
    const markerIndex = scenario.implementedEventIds.indexOf('spread-for-light-blast');
    const snapshotIndex = scenario.implementedEventIds.indexOf('light-blast-snapshot');
    const shiftReadyIndex = scenario.implementedEventIds.indexOf('shift-ready');
    const shiftCompleteIndex = scenario.implementedEventIds.indexOf('shift-complete');
    const magicTargetsIndex = scenario.implementedEventIds.indexOf('magic-burst-targets');
    const magicSnapshotIndex = scenario.implementedEventIds.indexOf('magic-burst-snapshot');
    const magicFirstImpactIndex = scenario.implementedEventIds.indexOf('magic-burst-first-impact');
    const magicSecondImpactIndex = scenario.implementedEventIds.indexOf('magic-burst-second-impact');
    const firstSpreadWindow = activeEventIndex.value >= markerIndex
      && activeEventIndex.value < snapshotIndex;
    const shiftWindow = mode.value === 'battle'
      && activeEventIndex.value >= shiftReadyIndex
      && activeEventIndex.value < shiftCompleteIndex;
    const magicPositioningWindow = mode.value === 'battle'
      && activeEventIndex.value >= magicTargetsIndex
      && activeEventIndex.value < magicSnapshotIndex;
    const magicEvacuationWindow = mode.value === 'battle'
      && activeEventIndex.value >= magicFirstImpactIndex
      && activeEventIndex.value < magicSecondImpactIndex;
    return firstSpreadWindow || shiftWindow || magicPositioningWindow || magicEvacuationWindow;
  });
  const patternStepProgress = computed(() => ({
    current: patternStepIndex.value + 1,
    total: scenario.pattern.stepSnapshots.length
  }));
  const evenExplosionActive = computed(() => eventReached('even-explosion-status')
    && !eventReached('enumeration-stack-resolved'));
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
    if (started.value) return;
    selectedPlayerId.value = id;
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
    clearShiftDisplayTimer();
    lightBlastSnapshot.value = null;
    shiftStartPositions.value = null;
    magicBurstStartPositions.value = null;
    magicBurstSnapshot.value = null;
    enumerationSnapshot.value = null;
    enumerationResult.value = null;
    patternStepIndex.value = 0;
    partyPositions.value = clonePartyPositions(initialPartyPositions);
  }

  function clearPatternStepTimer(): void {
    if (patternStepTimer !== null) clearTimeout(patternStepTimer);
    patternStepTimer = null;
  }

  function clearShiftDisplayTimer(): void {
    if (shiftDisplayTimer !== null) clearTimeout(shiftDisplayTimer);
    shiftDisplayTimer = null;
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

  function movePartyForShift(): void {
    const plan = shiftPlan.value;
    if (!plan) return;
    partyPositions.value = Object.fromEntries(scenario.party.map(member => {
      const shouldMove = mode.value === 'tutorial' || member.id !== selectedPlayerId.value;
      const target = plan.targetPositions[member.id];
      return [member.id, shouldMove && target
        ? { ...target }
        : { ...partyPositions.value[member.id] }];
    })) as PartyPositions;
  }

  function movePartyForMagicBurst(targets: Readonly<Record<SummonedDollsPartyId, ArenaPoint>>): void {
    partyPositions.value = Object.fromEntries(scenario.party.map(member => [
      member.id,
      mode.value === 'battle' && member.id === selectedPlayerId.value
        ? { ...partyPositions.value[member.id] }
        : { ...targets[member.id] }
    ])) as PartyPositions;
  }

  function scheduleTutorialShiftCompletion(): void {
    clearShiftDisplayTimer();
    if (mode.value !== 'tutorial' || currentEventId.value !== 'shift-to-former-aoe') return;
    shiftDisplayTimer = setTimeout(() => {
      shiftDisplayTimer = null;
      const completeIndex = scenario.implementedEventIds.indexOf('shift-complete');
      if (completeIndex >= 0) enterEvent(completeIndex);
    }, scenario.shiftDisplayMs);
  }

  function enterEvent(index: number): void {
    clearPatternStepTimer();
    clearShiftDisplayTimer();
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
    if (currentEventId.value === 'prepare-shift') {
      shiftStartPositions.value = clonePartyPositions(partyPositions.value);
    }
    if (currentEventId.value === 'shift-to-former-aoe') {
      movePartyForShift();
      scheduleTutorialShiftCompletion();
    }
    if (currentEventId.value === 'prepare-magic-burst') {
      magicBurstStartPositions.value = clonePartyPositions(partyPositions.value);
    }
    if (currentEventId.value === 'magic-burst-positioning') {
      movePartyForMagicBurst(scenario.magicBurst.placementPositions);
    }
    if (currentEventId.value === 'magic-burst-snapshot') {
      magicBurstSnapshot.value = {
        capturedAtEventId: 'magic-burst-snapshot',
        positions: clonePartyPositions(partyPositions.value),
        displayRadius: scenario.magicBurst.displayRadius,
        radiusConfirmed: false
      };
    }
    if (currentEventId.value === 'magic-burst-evacuation') {
      movePartyForMagicBurst(scenario.magicBurst.enumerationPreparationPositions);
    }
    if (currentEventId.value === 'enumeration-stack-snapshot') {
      enumerationSnapshot.value = {
        capturedAtEventId: 'enumeration-stack-snapshot',
        positions: clonePartyPositions(partyPositions.value)
      };
    }
    if (currentEventId.value === 'enumeration-stack-impact' && enumerationSnapshot.value) {
      enumerationResult.value = evaluateSummonedDollsEnumeration(
        scenario,
        enumerationSnapshot.value.positions
      );
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

  if (getCurrentScope()) onScopeDispose(() => {
    clearPatternStepTimer();
    clearShiftDisplayTimer();
  });

  return {
    scenario,
    mode,
    activeEventIndex,
    currentEvent,
    floorCells,
    partyPositions,
    lightBlastSnapshot,
    shiftStartPositions,
    shiftPlan,
    shiftPhase,
    magicBurstStartPositions,
    magicBurstSnapshot,
    magicBurstPhase,
    magicBurstCircles,
    enumerationSnapshot,
    enumerationResult,
    enumerationPhase,
    enumerationCircles,
    movementCandidates,
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
