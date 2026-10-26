import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import {
  LALARU_PLAYER_START,
  PLANAR_RESOLUTION_TIMING,
  PLANAR_TIMELINE,
  analysisRotationOffsetDegrees,
  generatePlanarMinesQuestion,
  planarAssignedPositions,
  planarExpectedInitialFacing,
  planarGapCell,
  planarMineCells,
  planarPathPoint,
  simulatePlanarMinesResolution,
  strategyCameraRotationDegrees,
  type ArenaPoint,
  type PlanarMineRevealState,
  type PlanarMinesQuestion,
  type PlanarPartyId,
  type PlanarPhase,
  type PlanarResolutionResult,
  type PlanarStrategy
} from '../mechanics/lalaru/index.ts';

export interface PlanarMinesScheduler {
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface LalaRuPlanarMinesTrainerOptions {
  questionFactory?: () => PlanarMinesQuestion;
  scheduler?: PlanarMinesScheduler;
}

const browserScheduler: PlanarMinesScheduler = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: handle => clearTimeout(handle)
};

function elapsedAtRemaining(remainingMs: number): number {
  return PLANAR_TIMELINE.durationMs - remainingMs;
}

function normalizeFacing(angle: number): number {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

export function useLalaRuPlanarMinesTrainer(
  options: LalaRuPlanarMinesTrainerOptions = {}
) {
  const scheduler = options.scheduler ?? browserScheduler;
  const questionFactory = options.questionFactory ?? generatePlanarMinesQuestion;
  const question = ref<PlanarMinesQuestion>(questionFactory());
  const strategy = ref<PlanarStrategy>('gap-bottom-left');
  const phase = ref<PlanarPhase>('idle');
  const remainingMs = ref<number>(PLANAR_TIMELINE.durationMs);
  const debuffsVisible = ref(false);
  const mineRevealState = ref<PlanarMineRevealState>('hidden');
  const rotationCueVisible = ref(false);
  const rotationDotCount = ref(0);
  const rotationAnimationKey = ref(0);
  const playerRotationApplied = ref(false);
  const playerPosition = ref<ArenaPoint>({ ...LALARU_PLAYER_START });
  const playerFacingAngle = ref(0);
  const placementSelected = ref(false);
  const placementConfirmed = ref(false);
  const showResolutionAnimation = ref(true);
  const round = ref(1);
  const successes = ref(0);
  const streak = ref(0);
  const resolutionResult = ref<PlanarResolutionResult | null>(null);
  const npcPositions = ref<Partial<Record<PlanarPartyId, ArenaPoint>>>({});
  const npcFacingAngles = ref<Partial<Record<PlanarPartyId, number>>>({});
  const remainingLayers = ref<Record<PlanarPartyId, number>>({
    you: 0, 'npc-a': 0, 'npc-b': 0, 'npc-c': 0
  });
  const triggeredMineKeys = ref<string[]>([]);
  const explodingMineKeys = ref<string[]>([]);
  const stackResolvingTargetIds = ref<PlanarPartyId[]>([]);
  const deathDialogOpen = ref(false);
  const handles = new Set<ReturnType<typeof setTimeout>>();
  let generation = 0;
  let resultRecorded = false;

  const mineCells = computed(() => planarMineCells(question.value.gap));
  const missingCell = computed(() => planarGapCell(question.value.gap));
  const assignments = computed(() => planarAssignedPositions(question.value, strategy.value));
  const playerAssignment = computed(() => assignments.value.find(item => item.member.id === 'you')!);
  const npcAssignments = computed(() => assignments.value.filter(item => item.member.id !== 'you'));
  const expectedCameraRotation = computed(() => strategyCameraRotationDegrees(question.value.gap, strategy.value));
  const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1_000));
  const canOperate = computed(() => phase.value === 'preparing');
  const rotationOffsets = computed(() => new Map(question.value.party.map(member => [
    member.id,
    analysisRotationOffsetDegrees(member.arrowSide, member.multiplier)
  ])));
  const actorPositions = computed<Readonly<Record<PlanarPartyId, ArenaPoint>>>(() => ({
    you: playerPosition.value,
    'npc-a': npcPositions.value['npc-a']!,
    'npc-b': npcPositions.value['npc-b']!,
    'npc-c': npcPositions.value['npc-c']!
  }));
  const actorFacingAngles = computed<Readonly<Record<PlanarPartyId, number>>>(() => ({
    you: playerFacingAngle.value,
    'npc-a': npcFacingAngles.value['npc-a'] ?? 0,
    'npc-b': npcFacingAngles.value['npc-b'] ?? 0,
    'npc-c': npcFacingAngles.value['npc-c'] ?? 0
  }));
  const succeeded = computed(() => resolutionResult.value?.success ?? null);
  const failureReason = computed(() => resolutionResult.value?.failureReason ?? '');

  function clearTimers(): void {
    generation += 1;
    for (const handle of handles) scheduler.clearTimeout(handle);
    handles.clear();
  }

  function schedule(callback: () => void, delay: number, activeGeneration: number): void {
    const handle = scheduler.setTimeout(() => {
      handles.delete(handle);
      if (generation !== activeGeneration) return;
      callback();
    }, delay);
    handles.add(handle);
  }

  function initializeRuntimeActors(resetPlayer: boolean): void {
    if (resetPlayer) {
      playerPosition.value = { ...LALARU_PLAYER_START };
      playerFacingAngle.value = 0;
    }
    const nextNpcPositions: Partial<Record<PlanarPartyId, ArenaPoint>> = {};
    const nextNpcFacing: Partial<Record<PlanarPartyId, number>> = {};
    for (const assignment of npcAssignments.value) {
      const offset = rotationOffsets.value.get(assignment.member.id) ?? 0;
      nextNpcPositions[assignment.member.id] = { ...assignment.worldPosition };
      nextNpcFacing[assignment.member.id] = planarExpectedInitialFacing(
        assignment,
        question.value,
        strategy.value,
        offset
      );
    }
    npcPositions.value = nextNpcPositions;
    npcFacingAngles.value = nextNpcFacing;
    remainingLayers.value = Object.fromEntries(
      question.value.party.map(member => [member.id, member.layer])
    ) as Record<PlanarPartyId, number>;
  }

  function resetResolutionState(): void {
    resolutionResult.value = null;
    triggeredMineKeys.value = [];
    explodingMineKeys.value = [];
    stackResolvingTargetIds.value = [];
    deathDialogOpen.value = false;
  }

  function resetAttemptState(): void {
    clearTimers();
    phase.value = 'idle';
    remainingMs.value = PLANAR_TIMELINE.durationMs;
    debuffsVisible.value = false;
    mineRevealState.value = 'hidden';
    rotationCueVisible.value = false;
    rotationDotCount.value = 0;
    playerRotationApplied.value = false;
    placementSelected.value = false;
    placementConfirmed.value = false;
    resultRecorded = false;
    resetResolutionState();
    initializeRuntimeActors(true);
  }

  function setActorPosition(id: PlanarPartyId, point: ArenaPoint): void {
    if (id === 'you') playerPosition.value = { ...point };
    else npcPositions.value = { ...npcPositions.value, [id]: { ...point } };
  }

  function applyResolutionSnapshot(result: PlanarResolutionResult): void {
    for (const actor of result.actorResults) setActorPosition(actor.id, actor.finalPosition);
    remainingLayers.value = Object.fromEntries(
      result.actorResults.map(actor => [actor.id, actor.remainingLayer])
    ) as Record<PlanarPartyId, number>;
    triggeredMineKeys.value = [...result.triggeredMineKeys];
  }

  function settleResolution(result: PlanarResolutionResult): void {
    if (!resultRecorded) {
      if (result.success) {
        successes.value += 1;
        streak.value += 1;
      } else {
        streak.value = 0;
      }
      resultRecorded = true;
    }
    stackResolvingTargetIds.value = [];
    phase.value = result.success ? 'resolved' : 'dead';
    deathDialogOpen.value = !result.success;
  }

  function playResolution(result: PlanarResolutionResult, activeGeneration: number): void {
    phase.value = 'forced-movement';
    for (
      let elapsed = PLANAR_RESOLUTION_TIMING.animationFrameMs;
      elapsed <= PLANAR_RESOLUTION_TIMING.forcedMoveDurationMs;
      elapsed += PLANAR_RESOLUTION_TIMING.animationFrameMs
    ) {
      const frameElapsed = elapsed;
      schedule(() => {
        const progress = frameElapsed / PLANAR_RESOLUTION_TIMING.forcedMoveDurationMs;
        for (const path of result.paths) setActorPosition(path.id, planarPathPoint(path, progress));
      }, frameElapsed, activeGeneration);
    }
    for (const event of result.mineEvents) {
      schedule(() => {
        triggeredMineKeys.value = [...triggeredMineKeys.value, event.mineKey];
        explodingMineKeys.value = [...explodingMineKeys.value, event.mineKey];
        remainingLayers.value = { ...event.remainingLayersAfter };
        schedule(() => {
          explodingMineKeys.value = explodingMineKeys.value.filter(key => key !== event.mineKey);
        }, PLANAR_RESOLUTION_TIMING.mineExplosionDurationMs, activeGeneration);
      }, event.atMs, activeGeneration);
    }

    const stackFailure = result.failureCode === 'stack-solo'
      || result.failureCode === 'stack-double-hit';
    const failedBeforeStack = !result.success && !stackFailure;
    if (result.failureCode === 'mine-overhit' && result.failureAtMs !== null) {
      schedule(() => {
        applyResolutionSnapshot(result);
        clearTimers();
        settleResolution(result);
      }, result.failureAtMs, activeGeneration);
      return;
    }
    if (failedBeforeStack) {
      schedule(() => {
        applyResolutionSnapshot(result);
        settleResolution(result);
      }, PLANAR_RESOLUTION_TIMING.forcedMoveDurationMs, activeGeneration);
      return;
    }

    schedule(() => {
      applyResolutionSnapshot(result);
      phase.value = 'stack-resolving';
      stackResolvingTargetIds.value = result.stackChecks.map(check => check.targetId);
    }, PLANAR_RESOLUTION_TIMING.doubleImpactAtMs, activeGeneration);
    schedule(() => settleResolution(result),
      PLANAR_RESOLUTION_TIMING.doubleImpactAtMs + PLANAR_RESOLUTION_TIMING.doubleImpactDurationMs,
      activeGeneration);
  }

  function beginResolution(activeGeneration: number): void {
    const nextNpcFacing = { ...npcFacingAngles.value };
    for (const assignment of npcAssignments.value) {
      nextNpcFacing[assignment.member.id] = normalizeFacing(
        (nextNpcFacing[assignment.member.id] ?? 0)
          + (rotationOffsets.value.get(assignment.member.id) ?? 0)
      );
    }
    npcFacingAngles.value = nextNpcFacing;
    playerFacingAngle.value = normalizeFacing(
      playerFacingAngle.value + (rotationOffsets.value.get('you') ?? 0)
    );
    playerRotationApplied.value = true;
    remainingMs.value = 0;
    rotationCueVisible.value = false;
    rotationDotCount.value = 0;
    placementConfirmed.value = true;

    const result = simulatePlanarMinesResolution(
      question.value,
      strategy.value,
      question.value.party.map(member => ({
        id: member.id,
        position: { ...actorPositions.value[member.id] },
        facingAngle: actorFacingAngles.value[member.id],
        layer: member.layer,
        explosionTarget: member.explosionTarget
      }))
    );
    resolutionResult.value = result;
    if (showResolutionAnimation.value) playResolution(result, activeGeneration);
    else {
      applyResolutionSnapshot(result);
      settleResolution(result);
    }
  }

  function start(): void {
    if (phase.value !== 'idle') return;
    clearTimers();
    resetResolutionState();
    initializeRuntimeActors(false);
    phase.value = 'preparing';
    remainingMs.value = PLANAR_TIMELINE.durationMs;
    debuffsVisible.value = true;
    mineRevealState.value = 'hidden';
    rotationCueVisible.value = false;
    rotationDotCount.value = 0;
    playerRotationApplied.value = false;
    rotationAnimationKey.value += 1;
    const activeGeneration = generation;

    for (let elapsed = PLANAR_TIMELINE.countdownDisplayStepMs; elapsed <= PLANAR_TIMELINE.durationMs; elapsed += PLANAR_TIMELINE.countdownDisplayStepMs) {
      schedule(() => {
        remainingMs.value = Math.max(0, PLANAR_TIMELINE.durationMs - elapsed);
      }, elapsed, activeGeneration);
    }
    schedule(() => { mineRevealState.value = 'telegraph'; }, elapsedAtRemaining(PLANAR_TIMELINE.mineTelegraphRemainingMs), activeGeneration);
    schedule(() => { mineRevealState.value = 'full'; }, elapsedAtRemaining(PLANAR_TIMELINE.mineFullRemainingMs), activeGeneration);
    schedule(() => { rotationCueVisible.value = true; }, elapsedAtRemaining(PLANAR_TIMELINE.rotationCueRemainingMs), activeGeneration);

    const dotStartElapsed = elapsedAtRemaining(PLANAR_TIMELINE.rotationCountdownStartRemainingMs);
    schedule(() => { rotationDotCount.value = PLANAR_TIMELINE.rotationCountdownDots; }, dotStartElapsed, activeGeneration);
    for (let step = 1; step < PLANAR_TIMELINE.rotationCountdownDots; step += 1) {
      schedule(() => {
        rotationDotCount.value = PLANAR_TIMELINE.rotationCountdownDots - step;
      }, dotStartElapsed + step * PLANAR_TIMELINE.rotationCountdownDotStepMs, activeGeneration);
    }
    schedule(() => beginResolution(activeGeneration), PLANAR_TIMELINE.durationMs, activeGeneration);
  }

  function retry(): void {
    resetAttemptState();
  }

  function restart(): void {
    resetAttemptState();
    start();
  }

  function setStrategy(next: PlanarStrategy): void {
    if (phase.value !== 'idle' && phase.value !== 'preparing') return;
    strategy.value = next;
    placementConfirmed.value = false;
    initializeRuntimeActors(false);
  }

  function setPlayerPosition(position: ArenaPoint): void {
    if (!canOperate.value) return;
    playerPosition.value = { ...position };
    placementSelected.value = true;
  }

  function setPlayerFacingAngle(angle: number): void {
    if (!canOperate.value) return;
    playerFacingAngle.value = normalizeFacing(angle);
  }

  function setShowResolutionAnimation(value: boolean): void {
    showResolutionAnimation.value = value;
    if (!value && resolutionResult.value
      && (phase.value === 'forced-movement' || phase.value === 'stack-resolving')) {
      const result = resolutionResult.value;
      clearTimers();
      applyResolutionSnapshot(result);
      settleResolution(result);
    }
  }

  function nextQuestion(): void {
    resetAttemptState();
    round.value += 1;
    question.value = questionFactory();
    rotationAnimationKey.value += 1;
    initializeRuntimeActors(true);
  }

  function confirmPlacement(): void {
    if (!canOperate.value || !placementSelected.value) return;
    placementConfirmed.value = true;
  }

  function closeDeathDialog(): void {
    deathDialogOpen.value = false;
  }

  initializeRuntimeActors(false);
  if (getCurrentScope()) onScopeDispose(clearTimers);

  return {
    question, strategy, phase, remainingMs, remainingSeconds, debuffsVisible,
    round, successes, streak,
    mineRevealState, rotationCueVisible, rotationDotCount, rotationAnimationKey,
    playerRotationApplied, rotationOffsets, canOperate, playerPosition,
    playerFacingAngle, placementSelected, placementConfirmed, mineCells,
    missingCell, assignments, playerAssignment, npcAssignments,
    expectedCameraRotation, showResolutionAnimation, resolutionResult, succeeded,
    failureReason, actorPositions, actorFacingAngles, remainingLayers,
    triggeredMineKeys, explodingMineKeys, stackResolvingTargetIds,
    deathDialogOpen, activeTimerCount: () => handles.size,
    start, retry, restart, setStrategy, setPlayerPosition, setPlayerFacingAngle,
    setShowResolutionAnimation, confirmPlacement, nextQuestion, closeDeathDialog
  };
}
