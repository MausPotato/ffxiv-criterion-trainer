import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import {
  ANALYSIS_GAP_HALF_ANGLE_DEGREES,
  COMPOSITE_ROUTE_LENGTH,
  COMPOSITE_TIMING,
  LALARU_BOSS_POSITION,
  LALARU_PLAYER_START,
  analysisGapCenterAngle,
  analysisRotationOffsetDegrees,
  attackSourceAngle,
  cellsAtStep,
  createCompositePattern,
  dangerousCellsThroughStep,
  dotCountdownSchedule,
  generateAnalysisQuestion,
  generateLalaRuQuestion,
  generateRotationMultiplicationCue,
  gridCellCenter,
  isAttackInAnalysisGap,
  isPointInDangerousCells,
  isPointInSafeSector,
  sameCell,
  signedAngleDifference,
  solveQuestion,
  type AnalysisDebuff,
  type ArenaPoint,
  type CardinalDirection,
  type CompositeOrbOrder,
  type CompositeOrientation,
  type CompositeRouteVariant,
  type GridCell,
  type LalaRuMode,
  type LalaRuQuestion,
  type RotationMultiplicationCue
} from '../mechanics/lalaru/index.ts';

export type CompositePhase =
  | 'idle'
  | 'analysis-lead'
  | 'preview'
  | 'stepping'
  | 'player-rotation'
  | 'high-precision'
  | 'dead'
  | 'resolved';
export type BossCannonState = 'hidden' | 'waiting' | 'telegraph' | 'resolving' | 'resolved';
export type PlayerRotationState = 'hidden' | 'waiting' | 'playing' | 'applied';

export interface CompositeScheduler {
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
  now?: () => number;
}

export interface CompositeTrainerOptions {
  scheduler?: CompositeScheduler;
  initialOrientation?: CompositeOrientation;
  initialOrbOrder?: CompositeOrbOrder;
  initialRouteVariant?: CompositeRouteVariant;
  orientationFactory?: () => CompositeOrientation;
  orbOrderFactory?: () => CompositeOrbOrder;
  routeVariantFactory?: () => CompositeRouteVariant;
  initialAnalysisDebuff?: AnalysisDebuff;
  analysisDebuffFactory?: () => AnalysisDebuff;
  initialBossQuestion?: LalaRuQuestion;
  bossQuestionFactory?: () => LalaRuQuestion;
  initialPlayerRotationCue?: RotationMultiplicationCue;
  playerRotationCueFactory?: () => RotationMultiplicationCue;
}

export interface CompositeAnalysisResult {
  source: 'orb-a' | 'orb-b' | 'boss-high-precision';
  sourcePosition: ArenaPoint;
  playerPosition: ArenaPoint;
  playerFacingAngle: number;
  gapRotationDegrees: number;
  sourceAngle: number | null;
  gapCenterAngle: number;
  succeeded: boolean;
}

export type CompositeOrbAnalysisResult = CompositeAnalysisResult & {
  source: 'orb-a' | 'orb-b';
  orbId: 'orb-a' | 'orb-b';
  orbPosition: ArenaPoint;
};

export type CompositeDeathEvent =
  | 'danger-floor'
  | 'orb-a'
  | 'boss-cannon'
  | 'orb-b'
  | 'high-precision';

export interface CompositeDeathRecord {
  event: CompositeDeathEvent;
  reason: string;
  elapsedMs: number;
  currentStep: number;
  playerPosition: ArenaPoint;
  playerFacingAngle: number;
  sourcePosition: ArenaPoint | null;
  sourceAngle: number | null;
  gapCenterAngle: number | null;
  angleDifference: number | null;
  finalSafeDirection: CardinalDirection | null;
}

const DEATH_REASONS: Readonly<Record<CompositeDeathEvent, string>> = {
  'danger-floor': '踩到危險地板。',
  'orb-a': '分析缺口沒有對準第一顆光球。',
  'boss-cannon': '沒有站進最終 90° 安全區。',
  'orb-b': '分析缺口沒有對準第二顆光球。',
  'high-precision': '旋轉後的分析缺口沒有對準 Boss。'
};

const browserScheduler: CompositeScheduler = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: handle => clearTimeout(handle),
  now: () => performance.now()
};

export function useLalaRuCompositeTrainer(options: CompositeTrainerOptions = {}) {
  const scheduler = options.scheduler ?? browserScheduler;
  const orientationFactory = options.orientationFactory
    ?? (() => Math.random() < 0.5 ? 'north-south' : 'east-west');
  const orbOrderFactory = options.orbOrderFactory
    ?? (() => Math.random() < 0.5 ? 'upper-first' : 'lower-first');
  const routeVariantFactory = options.routeVariantFactory
    ?? (() => Math.random() < 0.5 ? 'primary' : 'mirrored');
  const analysisDebuffFactory = options.analysisDebuffFactory
    ?? (() => generateAnalysisQuestion().debuff);
  const bossQuestionFactory = options.bossQuestionFactory ?? generateLalaRuQuestion;
  const playerRotationCueFactory = options.playerRotationCueFactory
    ?? generateRotationMultiplicationCue;

  const orientation = ref<CompositeOrientation>(options.initialOrientation ?? orientationFactory());
  const orbOrder = ref<CompositeOrbOrder>(options.initialOrbOrder ?? orbOrderFactory());
  const routeVariant = ref<CompositeRouteVariant>(
    options.initialRouteVariant ?? routeVariantFactory()
  );
  const analysisDebuff = ref<AnalysisDebuff>(options.initialAnalysisDebuff ?? analysisDebuffFactory());
  const bossQuestion = ref<LalaRuQuestion>(options.initialBossQuestion ?? bossQuestionFactory());
  const playerRotationCue = ref<RotationMultiplicationCue>(
    options.initialPlayerRotationCue ?? playerRotationCueFactory()
  );
  const pattern = computed(() => createCompositePattern(
    orientation.value,
    orbOrder.value,
    routeVariant.value
  ));
  const bossSolution = computed(() => solveQuestion(bossQuestion.value));
  const playerRotationOffsetSolution = computed(() => analysisRotationOffsetDegrees(
    playerRotationCue.value.arrowSide,
    playerRotationCue.value.multiplier
  ));
  const mode = ref<LalaRuMode>('tutorial');
  const phase = ref<CompositePhase>('idle');
  const paused = ref(false);
  const playerPosition = ref<ArenaPoint>({ ...LALARU_PLAYER_START });
  const playerFacingAngle = ref(0);
  const playerGapRotationDegrees = ref(0);
  const currentStep = ref(-1);
  const activeCells = ref<readonly GridCell[]>([]);
  const dangerousCells = ref<readonly GridCell[]>([]);
  const explodedOrbIds = ref<readonly string[]>([]);
  const explodingOrbIds = ref<readonly string[]>([]);
  const explosionCount = ref(0);
  const explosionKey = ref(0);
  const orbAnalysisResults = ref<readonly CompositeOrbAnalysisResult[]>([]);
  const highPrecisionResult = ref<CompositeAnalysisResult | null>(null);
  const highPrecisionImpactKey = ref(0);
  const bossCannonState = ref<BossCannonState>('hidden');
  const bossCannonSucceeded = ref<boolean | null>(null);
  const bossAnimationKey = ref(0);
  const bossDotCount = ref<number>(bossQuestion.value.dotPattern);
  const playerRotationState = ref<PlayerRotationState>('hidden');
  const playerRotationDotCount = ref<number>(playerRotationCue.value.dotPattern);
  const playerRotationAnimationKey = ref(0);
  const playerRotationCueElapsedMs = ref(0);
  const deathRecord = ref<CompositeDeathRecord | null>(null);
  const cameraResetKey = ref(0);
  const attempts = ref(0);
  const successes = ref(0);
  const nextStepInMs = ref(0);
  const handles = new Set<ReturnType<typeof setTimeout>>();
  let generation = 0;
  let pendingAdvance: { callback: () => void; dueAt: number } | null = null;
  let pausedAdvance: { callback: () => void; remainingMs: number } | null = null;
  let bossCueElapsedBeforeRun = 0;
  let bossCueRunStartedAt: number | null = null;
  let bossManualStartPathIndex: number | null = null;
  let bossCueStartDueAt: number | null = null;
  let bossCueStartRemainingMs: number = COMPOSITE_TIMING.bossCannonAfterFirstOrbDelayMs;
  let timelineStartedAt: number | null = null;

  const dangerFloorFailed = computed(() => deathRecord.value?.event === 'danger-floor');
  const hasFailed = computed(() => deathRecord.value !== null);
  const completedAllChecks = computed(() =>
    currentStep.value === COMPOSITE_ROUTE_LENGTH - 1
      && explosionCount.value === 2
      && orbAnalysisResults.value.length === 2
      && orbAnalysisResults.value.every(result => result.succeeded)
      && bossCannonSucceeded.value === true
      && playerRotationState.value === 'applied'
      && highPrecisionResult.value?.succeeded === true
      && !dangerFloorFailed.value
  );
  const succeeded = computed<boolean | null>(() => {
    if (deathRecord.value) return false;
    return phase.value === 'resolved' ? completedAllChecks.value : null;
  });
  const analysisFailed = computed(() =>
    orbAnalysisResults.value.some(result => !result.succeeded)
      || highPrecisionResult.value?.succeeded === false
  );
  const canMove = computed(() => phase.value !== 'resolved' && phase.value !== 'dead');
  const analysisResults = computed<readonly CompositeAnalysisResult[]>(() => [
    ...orbAnalysisResults.value,
    ...(highPrecisionResult.value ? [highPrecisionResult.value] : [])
  ]);
  const routeCellNumber = computed(() => currentStep.value < 0 ? 0 : currentStep.value + 1);
  const completedMoveCount = computed(() => Math.max(0, currentStep.value));

  function clearTimers(): void {
    generation += 1;
    for (const handle of handles) scheduler.clearTimeout(handle);
    handles.clear();
    pendingAdvance = null;
  }

  function schedule(callback: () => void, delay: number, activeGeneration: number): void {
    const handle = scheduler.setTimeout(() => {
      handles.delete(handle);
      if (generation !== activeGeneration) return;
      callback();
    }, delay);
    handles.add(handle);
  }

  function now(): number {
    return scheduler.now?.() ?? Date.now();
  }

  function scheduleAdvance(callback: () => void, delay: number, activeGeneration: number): void {
    pendingAdvance = { callback, dueAt: now() + delay };
    nextStepInMs.value = delay;
    schedule(() => {
      pendingAdvance = null;
      callback();
    }, delay, activeGeneration);
  }

  function resetProgress(): void {
    currentStep.value = -1;
    activeCells.value = [];
    dangerousCells.value = [];
    explodedOrbIds.value = [];
    explodingOrbIds.value = [];
    explosionCount.value = 0;
    orbAnalysisResults.value = [];
    highPrecisionResult.value = null;
    highPrecisionImpactKey.value += 1;
    bossCannonState.value = 'hidden';
    bossCannonSucceeded.value = null;
    bossDotCount.value = bossQuestion.value.dotPattern;
    bossCueElapsedBeforeRun = 0;
    bossCueRunStartedAt = null;
    bossManualStartPathIndex = null;
    bossCueStartDueAt = null;
    bossCueStartRemainingMs = COMPOSITE_TIMING.bossCannonAfterFirstOrbDelayMs;
    playerRotationState.value = 'hidden';
    playerRotationDotCount.value = playerRotationCue.value.dotPattern;
    playerRotationCueElapsedMs.value = 0;
    playerGapRotationDegrees.value = 0;
    deathRecord.value = null;
    nextStepInMs.value = 0;
    pausedAdvance = null;
    timelineStartedAt = null;
  }

  function recordDeath(
    event: CompositeDeathEvent,
    details: Partial<Pick<
      CompositeDeathRecord,
      'sourcePosition' | 'sourceAngle' | 'gapCenterAngle' | 'angleDifference' | 'finalSafeDirection'
    >> = {}
  ): boolean {
    if (deathRecord.value) return false;
    const deathPosition = { ...playerPosition.value };
    deathRecord.value = {
      event,
      reason: DEATH_REASONS[event],
      elapsedMs: timelineStartedAt === null ? 0 : Math.max(0, now() - timelineStartedAt),
      currentStep: currentStep.value,
      playerPosition: deathPosition,
      playerFacingAngle: playerFacingAngle.value,
      sourcePosition: details.sourcePosition ? { ...details.sourcePosition } : null,
      sourceAngle: details.sourceAngle ?? null,
      gapCenterAngle: details.gapCenterAngle ?? null,
      angleDifference: details.angleDifference ?? null,
      finalSafeDirection: details.finalSafeDirection ?? null
    };
    phase.value = 'dead';
    paused.value = false;
    nextStepInMs.value = 0;
    attempts.value += 1;
    clearTimers();
    return true;
  }

  function checkPlayerDamage(): boolean {
    if (deathRecord.value) return true;
    if (!isPointInDangerousCells(playerPosition.value, dangerousCells.value)) return false;
    recordDeath('danger-floor');
    return true;
  }

  function finish(): void {
    if (deathRecord.value || checkPlayerDamage()) return;
    phase.value = 'resolved';
    paused.value = false;
    nextStepInMs.value = 0;
    attempts.value += 1;
    if (completedAllChecks.value) successes.value += 1;
  }

  function resolveBossCannon(activeGeneration: number, autoSchedule = true): void {
    if (deathRecord.value || bossCannonState.value !== 'telegraph') return;
    bossCueElapsedBeforeRun = COMPOSITE_TIMING.bossCannonResolveMs;
    bossCueRunStartedAt = null;
    bossCannonState.value = 'resolving';
    if (checkPlayerDamage()) return;
    bossCannonSucceeded.value = isPointInSafeSector(
      playerPosition.value,
      bossSolution.value.finalSafeDirection
    );
    if (!bossCannonSucceeded.value) {
      recordDeath('boss-cannon', {
        sourcePosition: LALARU_BOSS_POSITION,
        sourceAngle: attackSourceAngle(playerPosition.value, LALARU_BOSS_POSITION),
        finalSafeDirection: bossSolution.value.finalSafeDirection
      });
      return;
    }
    if (autoSchedule) {
      schedule(() => { bossCannonState.value = 'resolved'; }, COMPOSITE_TIMING.bossCannonImpactMs, activeGeneration);
    }
  }

  function currentBossCueElapsed(): number {
    return bossCueElapsedBeforeRun
      + (bossCueRunStartedAt === null ? 0 : Math.max(0, now() - bossCueRunStartedAt));
  }

  function freezeBossCannonTimeline(): void {
    if (bossCannonState.value !== 'telegraph' || bossCueRunStartedAt === null) return;
    bossCueElapsedBeforeRun = currentBossCueElapsed();
    bossCueRunStartedAt = null;
  }

  function scheduleBossCannonTimeline(): void {
    if (bossCannonState.value !== 'telegraph') return;
    const elapsed = currentBossCueElapsed();
    const activeGeneration = generation;
    bossCueElapsedBeforeRun = elapsed;
    bossCueRunStartedAt = now();

    for (const step of dotCountdownSchedule(bossQuestion.value.dotPattern)) {
      if (step.atMs <= elapsed) continue;
      schedule(() => { bossDotCount.value = step.count; }, step.atMs - elapsed, activeGeneration);
    }
    schedule(
      () => resolveBossCannon(activeGeneration),
      Math.max(0, COMPOSITE_TIMING.bossCannonResolveMs - elapsed),
      activeGeneration
    );
  }

  function startBossCannonCue(autoSchedule: boolean): void {
    if (deathRecord.value) return;
    if (bossCannonState.value !== 'hidden' && bossCannonState.value !== 'waiting') return;
    bossCannonState.value = 'telegraph';
    bossCannonSucceeded.value = null;
    bossDotCount.value = bossQuestion.value.dotPattern;
    bossAnimationKey.value += 1;
    bossCueElapsedBeforeRun = 0;
    bossCueRunStartedAt = null;
    bossManualStartPathIndex = currentStep.value;
    bossCueStartDueAt = null;
    bossCueStartRemainingMs = 0;
    if (autoSchedule) scheduleBossCannonTimeline();
  }

  function scheduleBossCannonStart(delay = bossCueStartRemainingMs): void {
    if (bossCannonState.value !== 'waiting') return;
    const activeGeneration = generation;
    bossCueStartRemainingMs = Math.max(0, delay);
    bossCueStartDueAt = now() + bossCueStartRemainingMs;
    schedule(() => startBossCannonCue(true), bossCueStartRemainingMs, activeGeneration);
  }

  function queueBossCannonCue(autoSchedule: boolean): void {
    if (deathRecord.value) return;
    if (bossCannonState.value !== 'hidden') return;
    bossCannonState.value = 'waiting';
    bossCueStartRemainingMs = COMPOSITE_TIMING.bossCannonAfterFirstOrbDelayMs;
    if (autoSchedule) scheduleBossCannonStart();
  }

  function updateManualBossCannon(): void {
    if (deathRecord.value) return;
    if (bossCannonState.value !== 'telegraph' || bossManualStartPathIndex === null) return;
    const elapsed = Math.max(0, currentStep.value - bossManualStartPathIndex)
      * COMPOSITE_TIMING.stepIntervalMs;
    const latestDotStep = [...dotCountdownSchedule(bossQuestion.value.dotPattern)]
      .reverse()
      .find(step => step.atMs <= elapsed);
    bossDotCount.value = latestDotStep?.count ?? bossQuestion.value.dotPattern;
    if (elapsed >= COMPOSITE_TIMING.bossCannonResolveMs) resolveBossCannon(generation, false);
  }

  function createAnalysisResult(
    source: CompositeAnalysisResult['source'],
    sourcePosition: ArenaPoint,
    gapRotationDegrees: number
  ): CompositeAnalysisResult {
    const playerSnapshot = { ...playerPosition.value };
    const facingSnapshot = playerFacingAngle.value;
    return {
      source,
      sourcePosition: { ...sourcePosition },
      playerPosition: playerSnapshot,
      playerFacingAngle: facingSnapshot,
      gapRotationDegrees,
      sourceAngle: attackSourceAngle(playerSnapshot, sourcePosition),
      gapCenterAngle: analysisGapCenterAngle(
        facingSnapshot,
        analysisDebuff.value,
        gapRotationDegrees
      ),
      succeeded: isAttackInAnalysisGap(
        playerSnapshot,
        facingSnapshot,
        analysisDebuff.value,
        sourcePosition,
        ANALYSIS_GAP_HALF_ANGLE_DEGREES,
        gapRotationDegrees
      )
    };
  }

  function resolveHighPrecision(): void {
    if (deathRecord.value || highPrecisionResult.value) return;
    const result = createAnalysisResult(
      'boss-high-precision',
      LALARU_BOSS_POSITION,
      playerGapRotationDegrees.value
    );
    highPrecisionResult.value = result;
    highPrecisionImpactKey.value += 1;
    if (!result.succeeded) {
      recordDeath('high-precision', {
        sourcePosition: result.sourcePosition,
        sourceAngle: result.sourceAngle,
        gapCenterAngle: result.gapCenterAngle,
        angleDifference: result.sourceAngle === null
          ? null
          : signedAngleDifference(result.sourceAngle, result.gapCenterAngle)
      });
      return;
    }
    finish();
  }

  function applyPlayerRotation(autoSchedule: boolean): void {
    if (deathRecord.value) return;
    if (playerRotationState.value === 'applied') return;
    playerGapRotationDegrees.value = playerRotationOffsetSolution.value;
    playerRotationState.value = 'applied';
    phase.value = 'high-precision';
    if (autoSchedule) {
      scheduleAdvance(resolveHighPrecision, COMPOSITE_TIMING.highPrecisionDelayMs, generation);
    } else nextStepInMs.value = 0;
  }

  function scheduleNextPlayerRotationEvent(): void {
    if (deathRecord.value) return;
    const activeGeneration = generation;
    if (playerRotationDotCount.value <= 1) {
      const remaining = Math.max(
        0,
        COMPOSITE_TIMING.playerRotationResolveMs - playerRotationCueElapsedMs.value
      );
      scheduleAdvance(() => applyPlayerRotation(true), remaining, activeGeneration);
      return;
    }
    const delay = playerRotationCueElapsedMs.value === 0
      ? COMPOSITE_TIMING.playerRotationDotFirstChangeMs
      : COMPOSITE_TIMING.playerRotationDotStepMs;
    scheduleAdvance(() => {
      playerRotationCueElapsedMs.value += delay;
      playerRotationDotCount.value -= 1;
      scheduleNextPlayerRotationEvent();
    }, delay, activeGeneration);
  }

  function startPlayerRotationCue(autoSchedule: boolean): void {
    if (deathRecord.value) return;
    playerRotationState.value = 'playing';
    phase.value = 'player-rotation';
    playerRotationDotCount.value = playerRotationCue.value.dotPattern;
    playerRotationCueElapsedMs.value = 0;
    playerRotationAnimationKey.value += 1;
    if (autoSchedule) scheduleNextPlayerRotationEvent();
    else nextStepInMs.value = 0;
  }

  function beginPlayerRotationSequence(autoSchedule: boolean): void {
    if (deathRecord.value) return;
    if (playerRotationState.value !== 'hidden') return;
    playerRotationState.value = 'waiting';
    phase.value = 'player-rotation';
    if (!autoSchedule || COMPOSITE_TIMING.playerRotationCueDelayMs === 0) {
      startPlayerRotationCue(autoSchedule);
      return;
    }
    scheduleAdvance(
      () => startPlayerRotationCue(true),
      COMPOSITE_TIMING.playerRotationCueDelayMs,
      generation
    );
  }

  function triggerOrbs(
    cells: readonly GridCell[],
    activeGeneration: number,
    autoSchedule: boolean
  ): void {
    if (deathRecord.value) return;
    const alreadyExploded = new Set(explodedOrbIds.value);
    const triggered = pattern.value.orbs.filter(orb =>
      !alreadyExploded.has(orb.id) && cells.some(cell => sameCell(cell, orb.cell))
    );
    if (!triggered.length) return;

    const ids = triggered.map(orb => orb.id);
    const results = triggered.map<CompositeOrbAnalysisResult>(orb => {
      const sourcePosition = gridCellCenter(orb.cell);
      const result = createAnalysisResult(orb.id, sourcePosition, 0);
      return { ...result, source: orb.id, orbId: orb.id, orbPosition: sourcePosition };
    });
    explodedOrbIds.value = [...explodedOrbIds.value, ...ids];
    orbAnalysisResults.value = [...orbAnalysisResults.value, ...results];
    explodingOrbIds.value = ids;
    explosionCount.value += ids.length;
    explosionKey.value += 1;

    const failedResult = results.find(result => !result.succeeded);
    if (failedResult) {
      recordDeath(failedResult.orbId, {
        sourcePosition: failedResult.sourcePosition,
        sourceAngle: failedResult.sourceAngle,
        gapCenterAngle: failedResult.gapCenterAngle,
        angleDifference: failedResult.sourceAngle === null
          ? null
          : signedAngleDifference(failedResult.sourceAngle, failedResult.gapCenterAngle)
      });
      return;
    }

    schedule(() => { explodingOrbIds.value = []; }, COMPOSITE_TIMING.orbExplosionMs, activeGeneration);

    if (alreadyExploded.size === 0) queueBossCannonCue(autoSchedule);

    if (explodedOrbIds.value.length === pattern.value.orbs.length) {
      beginPlayerRotationSequence(autoSchedule);
    }
  }

  function advanceOneStep(autoSchedule = true): void {
    if (deathRecord.value) return;
    if (currentStep.value >= COMPOSITE_ROUTE_LENGTH - 1) {
      beginPlayerRotationSequence(autoSchedule);
      return;
    }

    phase.value = 'stepping';
    currentStep.value += 1;
    activeCells.value = cellsAtStep(pattern.value, currentStep.value);
    dangerousCells.value = dangerousCellsThroughStep(pattern.value, currentStep.value);
    const activeGeneration = generation;
    // A newly active floor cell resolves before any orb it touches on the same step.
    if (checkPlayerDamage()) return;
    triggerOrbs(activeCells.value, activeGeneration, autoSchedule);
    if (deathRecord.value) return;
    if (!autoSchedule) updateManualBossCannon();
    if (deathRecord.value) return;

    if (!autoSchedule) {
      nextStepInMs.value = 0;
      return;
    }
    // The second orb is on pathIndex 9 (route cell 10, after nine moves).
    // Its trigger starts the player cue, so preserve that cue's scheduled countdown.
    if (currentStep.value >= COMPOSITE_ROUTE_LENGTH - 1) return;
    scheduleAdvance(() => advanceOneStep(true), COMPOSITE_TIMING.stepIntervalMs, activeGeneration);
  }

  function beginStepping(): void {
    if (deathRecord.value) return;
    phase.value = 'stepping';
    const activeGeneration = generation;
    if (COMPOSITE_TIMING.firstActivationOffsetMs === 0) advanceOneStep(true);
    else scheduleAdvance(
      () => advanceOneStep(true),
      COMPOSITE_TIMING.firstActivationOffsetMs,
      activeGeneration
    );
  }

  function beginPreview(): void {
    if (deathRecord.value) return;
    phase.value = 'preview';
    scheduleAdvance(beginStepping, COMPOSITE_TIMING.previewDurationMs, generation);
  }

  function start(): void {
    if (phase.value !== 'idle' && phase.value !== 'resolved' && !paused.value) return;
    clearTimers();
    resetProgress();
    timelineStartedAt = now();
    phase.value = 'analysis-lead';
    paused.value = false;
    scheduleAdvance(beginPreview, COMPOSITE_TIMING.analysisLeadInMs, generation);
  }

  function fallbackResume(): { callback: () => void; remainingMs: number } {
    if (phase.value === 'analysis-lead') {
      return { callback: beginPreview, remainingMs: COMPOSITE_TIMING.analysisLeadInMs };
    }
    if (phase.value === 'preview') {
      return { callback: beginStepping, remainingMs: COMPOSITE_TIMING.previewDurationMs };
    }
    if (playerRotationState.value === 'playing') {
      return { callback: scheduleNextPlayerRotationEvent, remainingMs: 0 };
    }
    if (playerRotationState.value === 'applied' && !highPrecisionResult.value) {
      return { callback: resolveHighPrecision, remainingMs: COMPOSITE_TIMING.highPrecisionDelayMs };
    }
    return { callback: () => advanceOneStep(true), remainingMs: COMPOSITE_TIMING.stepIntervalMs };
  }

  function togglePause(): void {
    if (phase.value === 'idle' || phase.value === 'dead' || phase.value === 'resolved') return;
    if (!paused.value) {
      pausedAdvance = pendingAdvance
        ? { callback: pendingAdvance.callback, remainingMs: Math.max(0, pendingAdvance.dueAt - now()) }
        : null;
      freezeBossCannonTimeline();
      if (bossCannonState.value === 'waiting' && bossCueStartDueAt !== null) {
        bossCueStartRemainingMs = Math.max(0, bossCueStartDueAt - now());
        bossCueStartDueAt = null;
      }
      clearTimers();
      paused.value = true;
      explodingOrbIds.value = [];
      if (bossCannonState.value === 'resolving') bossCannonState.value = 'resolved';
      nextStepInMs.value = 0;
      return;
    }

    paused.value = false;
    const resume = pausedAdvance ?? fallbackResume();
    pausedAdvance = null;
    if (bossCannonState.value === 'waiting') scheduleBossCannonStart();
    if (bossCannonState.value === 'telegraph') scheduleBossCannonTimeline();
    scheduleAdvance(resume.callback, resume.remainingMs, generation);
  }

  function stepForward(): void {
    if (phase.value === 'dead' || phase.value === 'resolved') return;
    freezeBossCannonTimeline();
    if (bossCannonState.value === 'waiting') {
      bossCueStartDueAt = null;
      bossCueStartRemainingMs = 0;
    }
    clearTimers();
    if (bossCannonState.value === 'resolving') bossCannonState.value = 'resolved';
    if (bossCannonState.value === 'waiting') startBossCannonCue(false);
    pausedAdvance = null;
    paused.value = true;
    if (currentStep.value < COMPOSITE_ROUTE_LENGTH - 1) {
      if (phase.value === 'idle') {
        phase.value = 'analysis-lead';
        nextStepInMs.value = 0;
        return;
      }
      if (phase.value === 'analysis-lead') {
        phase.value = 'preview';
        nextStepInMs.value = 0;
        return;
      }
      if (phase.value === 'preview') {
        phase.value = 'stepping';
      }
      advanceOneStep(false);
      return;
    }
    if (playerRotationState.value === 'hidden' || playerRotationState.value === 'waiting') {
      startPlayerRotationCue(false);
    } else if (playerRotationState.value === 'playing') {
      if (playerRotationDotCount.value > 1) playerRotationDotCount.value -= 1;
      else applyPlayerRotation(false);
    } else if (!highPrecisionResult.value) resolveHighPrecision();
  }

  function resetAttempt(): void {
    clearTimers();
    resetProgress();
    phase.value = 'idle';
    paused.value = false;
    playerPosition.value = { ...LALARU_PLAYER_START };
    playerFacingAngle.value = 0;
    cameraResetKey.value += 1;
  }

  function retry(): void {
    resetAttempt();
    start();
  }

  function replay(): void {
    retry();
  }

  function loadQuestion(
    nextOrientation: CompositeOrientation,
    nextOrbOrder: CompositeOrbOrder,
    nextRouteVariant: CompositeRouteVariant
  ): void {
    clearTimers();
    orientation.value = nextOrientation;
    orbOrder.value = nextOrbOrder;
    routeVariant.value = nextRouteVariant;
    analysisDebuff.value = analysisDebuffFactory();
    bossQuestion.value = bossQuestionFactory();
    playerRotationCue.value = playerRotationCueFactory();
    resetProgress();
    phase.value = 'idle';
    paused.value = false;
    playerPosition.value = { ...LALARU_PLAYER_START };
    playerFacingAngle.value = 0;
    cameraResetKey.value += 1;
  }

  function nextQuestion(): void {
    loadQuestion(orientationFactory(), orbOrderFactory(), routeVariantFactory());
  }

  function setPlayerPosition(position: ArenaPoint): void {
    if (!canMove.value) return;
    playerPosition.value = position;
    if (dangerousCells.value.length) checkPlayerDamage();
  }

  function setPlayerFacingAngle(facingAngle: number): void {
    if (!canMove.value) return;
    playerFacingAngle.value = facingAngle;
  }

  function setMode(nextMode: LalaRuMode): void {
    mode.value = nextMode;
  }

  if (getCurrentScope()) onScopeDispose(clearTimers);

  return {
    orientation,
    orbOrder,
    routeVariant,
    analysisDebuff,
    bossQuestion,
    bossSolution,
    playerRotationCue,
    playerRotationOffsetSolution,
    pattern,
    mode,
    phase,
    paused,
    playerPosition,
    playerFacingAngle,
    playerGapRotationDegrees,
    currentStep,
    routeCellNumber,
    completedMoveCount,
    activeCells,
    dangerousCells,
    explodedOrbIds,
    explodingOrbIds,
    explosionCount,
    explosionKey,
    orbAnalysisResults,
    highPrecisionResult,
    highPrecisionImpactKey,
    bossCannonState,
    bossCannonSucceeded,
    bossAnimationKey,
    bossDotCount,
    playerRotationState,
    playerRotationDotCount,
    playerRotationAnimationKey,
    deathRecord,
    cameraResetKey,
    dangerFloorFailed,
    hasFailed,
    attempts,
    successes,
    nextStepInMs,
    succeeded,
    analysisFailed,
    analysisResults,
    completedAllChecks,
    canMove,
    activeTimerCount: () => handles.size,
    start,
    togglePause,
    stepForward,
    retry,
    replay,
    nextQuestion,
    setPlayerPosition,
    setPlayerFacingAngle,
    setMode
  };
}
