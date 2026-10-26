import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import {
  LALARU_BOSS_POSITION,
  SPATIAL_BOMBS_TIMING,
  SPATIAL_PARTY_IDS,
  SPATIAL_ROUTE_STEPS,
  createSpatialBombPattern,
  generateLalaRuQuestion,
  isPointInSafeSector,
  movementSegmentTouchesDanger,
  rotateSpatialPoint,
  shuffleSpatialLayers,
  solveQuestion,
  spatialCellsAtStep,
  spatialDamageSourcesAtStep,
  spatialDangerousCellsThroughStep,
  spatialSourceHitsPoint,
  spatialStandardPosition,
  type ArenaPoint,
  type GridCell,
  type LalaRuQuestion,
  type QuarterTurn,
  type SpatialBombQuestion,
  type SpatialDamageSource,
  type SpatialPartyId,
  type SubtractionLayer
} from '../mechanics/lalaru/index.ts';

export type SpatialBombPhase = 'idle' | 'lead-in' | 'preview' | 'stepping' | 'cannon-countdown' | 'cannon-impact' | 'dead' | 'resolved';
export type SpatialDeathCode = 'danger-floor' | 'overhit' | 'debuff-expired' | 'cannon';

export interface SpatialDeathRecord {
  actorId: SpatialPartyId;
  code: SpatialDeathCode;
  reason: string;
  remainingLayers: number;
  position: ArenaPoint;
  elapsedMs: number;
  step: number;
  sourceId: string | null;
}

export interface SpatialDamageRecord {
  sourceId: string;
  kind: SpatialDamageSource['kind'];
  step: number;
  actorId: SpatialPartyId;
  position: ArenaPoint;
  before: number;
  after: number;
  lethal: boolean;
}

export interface SpatialScheduler {
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
  now?: () => number;
}

export interface SpatialBombTrainerOptions {
  scheduler?: SpatialScheduler;
  questionFactory?: () => SpatialBombQuestion;
  random?: () => number;
}

const browserScheduler: SpatialScheduler = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: handle => clearTimeout(handle),
  now: () => performance.now()
};

const DEATH_REASONS: Readonly<Record<SpatialDeathCode, string>> = {
  'danger-floor': '移動路徑碰觸已步進的即死區域',
  overhit: '減算炸彈已歸零，仍再次受到傷害',
  'debuff-expired': '減算炸彈到期時仍有剩餘層數並引發大爆炸',
  cannon: '遭到旋轉角魔紋炮命中'
};

function randomQuarterTurn(random: () => number): QuarterTurn {
  return Math.min(3, Math.floor(random() * 4)) as QuarterTurn;
}

function createQuestion(random: () => number): SpatialBombQuestion {
  const layers = shuffleSpatialLayers(random);
  return {
    // Randomize the route fixture, not the camera. This produces the vertical,
    // horizontal, and two reversed composite-pattern layouts while N/S stays upright.
    rotation: randomQuarterTurn(random),
    party: SPATIAL_PARTY_IDS.map((id, index) => ({ id, initialLayer: layers[index]! })),
    cannon: generateLalaRuQuestion(random)
  };
}

export function useLalaRuSpatialBombsTrainer(options: SpatialBombTrainerOptions = {}) {
  const scheduler = options.scheduler ?? browserScheduler;
  const random = options.random ?? Math.random;
  const questionFactory = options.questionFactory ?? (() => createQuestion(random));
  const question = ref<SpatialBombQuestion>(questionFactory());
  const pattern = computed(() => createSpatialBombPattern(question.value.rotation));
  const cannonSolution = computed(() => solveQuestion(question.value.cannon));
  const phase = ref<SpatialBombPhase>('idle');
  const currentStep = ref(0);
  const activeCells = ref<readonly GridCell[]>([]);
  const dangerousCells = ref<readonly GridCell[]>([]);
  const explodingSourceIds = ref<readonly string[]>([]);
  const removedSourceIds = ref<readonly string[]>([]);
  const damageRecords = ref<readonly SpatialDamageRecord[]>([]);
  const deathRecord = ref<SpatialDeathRecord | null>(null);
  const cannonSeconds = ref(5);
  const cannonImpactKey = ref(0);
  const cameraResetKey = ref(0);
  const attempts = ref(0);
  const successes = ref(0);
  const handles = new Set<ReturnType<typeof setTimeout>>();
  let generation = 0;
  let startedAt: number | null = null;

  function memberLayer(id: SpatialPartyId): SubtractionLayer {
    return question.value.party.find(member => member.id === id)!.initialLayer;
  }

  function initialPositions(): Record<SpatialPartyId, ArenaPoint> {
    return Object.fromEntries(question.value.party.map(member => [
      member.id,
      spatialStandardPosition(member.initialLayer, question.value.rotation)
    ])) as Record<SpatialPartyId, ArenaPoint>;
  }

  function initialLayers(): Record<SpatialPartyId, number> {
    return Object.fromEntries(question.value.party.map(member => [member.id, member.initialLayer])) as Record<SpatialPartyId, number>;
  }

  const actorPositions = ref<Record<SpatialPartyId, ArenaPoint>>(initialPositions());
  const remainingLayers = ref<Record<SpatialPartyId, number>>(initialLayers());
  const deadActorIds = ref<readonly SpatialPartyId[]>([]);
  const playerPosition = computed(() => actorPositions.value.you);
  const playerFacingAngle = ref(0);
  const canMove = computed(() => phase.value !== 'idle' && phase.value !== 'dead' && phase.value !== 'resolved');
  const succeeded = computed<boolean | null>(() => phase.value === 'resolved' ? true : phase.value === 'dead' ? false : null);

  function now(): number {
    return scheduler.now?.() ?? Date.now();
  }

  function clearTimers(): void {
    generation += 1;
    for (const handle of handles) scheduler.clearTimeout(handle);
    handles.clear();
  }

  function schedule(callback: () => void, delay: number): void {
    const activeGeneration = generation;
    const handle = scheduler.setTimeout(() => {
      handles.delete(handle);
      if (generation === activeGeneration) callback();
    }, delay);
    handles.add(handle);
  }

  function recordDeath(
    actorId: SpatialPartyId,
    code: SpatialDeathCode,
    sourceId: string | null = null
  ): void {
    if (!deadActorIds.value.includes(actorId)) deadActorIds.value = [...deadActorIds.value, actorId];
    if (deathRecord.value || actorId !== 'you') return;
    deathRecord.value = {
      actorId,
      code,
      reason: DEATH_REASONS[code],
      remainingLayers: remainingLayers.value[actorId],
      position: { ...actorPositions.value[actorId] },
      elapsedMs: startedAt === null ? 0 : Math.max(0, now() - startedAt),
      step: currentStep.value,
      sourceId
    };
    phase.value = 'dead';
    attempts.value += 1;
    clearTimers();
  }

  function setActorPosition(id: SpatialPartyId, position: ArenaPoint): void {
    actorPositions.value = { ...actorPositions.value, [id]: { ...position } };
  }

  function applySource(source: SpatialDamageSource): void {
    for (const id of SPATIAL_PARTY_IDS) {
      if (deadActorIds.value.includes(id)) continue;
      const position = actorPositions.value[id];
      if (!spatialSourceHitsPoint(source, position)) continue;
      const before = remainingLayers.value[id];
      const lethal = before <= 0;
      const after = lethal ? 0 : before - 1;
      remainingLayers.value = { ...remainingLayers.value, [id]: after };
      damageRecords.value = [...damageRecords.value, {
        sourceId: source.id,
        kind: source.kind,
        step: source.step,
        actorId: id,
        position: { ...position },
        before,
        after,
        lethal
      }];
      if (lethal) recordDeath(id, 'overhit', source.id);
    }
  }

  function checkDangerAtPositions(): void {
    for (const id of SPATIAL_PARTY_IDS) {
      if (deadActorIds.value.includes(id)) continue;
      const point = actorPositions.value[id];
      if (movementSegmentTouchesDanger(point, point, dangerousCells.value)) {
        recordDeath(id, 'danger-floor');
      }
    }
  }

  function moveNpcForStep(step: number): void {
    for (const member of question.value.party.filter(candidate => candidate.id !== 'you')) {
      if (step === 3 && member.initialLayer === 1) {
        setActorPosition(member.id, rotateSpatialPoint({ x: 2.5, y: 1.5 }, question.value.rotation));
      }
      if (step === 6 && member.initialLayer === 4) {
        setActorPosition(member.id, rotateSpatialPoint({ x: 2.5, y: 4.5 }, question.value.rotation));
      }
    }
  }

  function resolveCannon(): void {
    if (phase.value !== 'cannon-countdown' || deathRecord.value) return;
    phase.value = 'cannon-impact';
    cannonImpactKey.value += 1;
    if (!isPointInSafeSector(playerPosition.value, cannonSolution.value.finalSafeDirection)) {
      recordDeath('you', 'cannon', 'magic-cannon');
      return;
    }
    schedule(() => {
      phase.value = 'resolved';
      attempts.value += 1;
      successes.value += 1;
    }, SPATIAL_BOMBS_TIMING.cannonImpactMs);
  }

  function tickCannonCountdown(): void {
    if (phase.value !== 'cannon-countdown') return;
    if (cannonSeconds.value <= 1) {
      schedule(resolveCannon, SPATIAL_BOMBS_TIMING.cannonCountdownStepMs);
      return;
    }
    schedule(() => {
      cannonSeconds.value -= 1;
      tickCannonCountdown();
    }, SPATIAL_BOMBS_TIMING.cannonCountdownStepMs);
  }

  function beginCannon(): void {
    if (deathRecord.value) return;
    phase.value = 'cannon-countdown';
    cannonSeconds.value = 5;
    tickCannonCountdown();
  }

  function finishBombs(): void {
    for (const id of SPATIAL_PARTY_IDS) {
      if (!deadActorIds.value.includes(id) && remainingLayers.value[id] > 0) {
        recordDeath(id, 'debuff-expired', 'debuff-expiry');
      }
    }
    if (!deathRecord.value) schedule(beginCannon, SPATIAL_BOMBS_TIMING.cannonAfterFinalBombDelayMs);
  }

  function advanceStep(): void {
    if (deathRecord.value || currentStep.value >= SPATIAL_ROUTE_STEPS) return;
    phase.value = 'stepping';
    currentStep.value += 1;
    activeCells.value = spatialCellsAtStep(pattern.value, currentStep.value);
    dangerousCells.value = spatialDangerousCellsThroughStep(pattern.value, currentStep.value);
    checkDangerAtPositions();
    if (deathRecord.value) return;

    const sources = spatialDamageSourcesAtStep(pattern.value, currentStep.value);
    explodingSourceIds.value = sources.map(source => source.id);
    for (const source of sources) applySource(source);
    moveNpcForStep(currentStep.value);
    schedule(() => {
      const sourceIds = sources.map(source => source.id);
      explodingSourceIds.value = [];
      removedSourceIds.value = [...new Set([...removedSourceIds.value, ...sourceIds])];
    }, SPATIAL_BOMBS_TIMING.explosionDurationMs);
    if (deathRecord.value) return;
    if (currentStep.value === SPATIAL_ROUTE_STEPS) {
      finishBombs();
      return;
    }
    schedule(advanceStep, SPATIAL_BOMBS_TIMING.stepIntervalMs);
  }

  function resetProgress(): void {
    currentStep.value = 0;
    activeCells.value = [];
    dangerousCells.value = [];
    explodingSourceIds.value = [];
    removedSourceIds.value = [];
    damageRecords.value = [];
    deathRecord.value = null;
    deadActorIds.value = [];
    remainingLayers.value = initialLayers();
    actorPositions.value = initialPositions();
    playerFacingAngle.value = 0;
    cannonSeconds.value = 5;
    startedAt = null;
  }

  function start(): void {
    if (phase.value !== 'idle') return;
    clearTimers();
    remainingLayers.value = initialLayers();
    deadActorIds.value = [];
    deathRecord.value = null;
    damageRecords.value = [];
    startedAt = now();
    phase.value = 'lead-in';
    schedule(beginPreview, SPATIAL_BOMBS_TIMING.revealDelayMs);
  }

  function beginPreview(): void {
    if (phase.value !== 'lead-in' || deathRecord.value) return;
    phase.value = 'preview';
    schedule(advanceStep, SPATIAL_BOMBS_TIMING.previewDurationMs + SPATIAL_BOMBS_TIMING.firstStepOffsetMs);
  }

  function retry(): void {
    clearTimers();
    resetProgress();
    phase.value = 'idle';
    cameraResetKey.value += 1;
  }

  function nextQuestion(): void {
    clearTimers();
    question.value = questionFactory();
    resetProgress();
    phase.value = 'idle';
    cameraResetKey.value += 1;
  }

  function setPlayerPosition(position: ArenaPoint): void {
    if (!canMove.value) return;
    const previous = playerPosition.value;
    setActorPosition('you', position);
    if (dangerousCells.value.length && movementSegmentTouchesDanger(previous, position, dangerousCells.value)) {
      recordDeath('you', 'danger-floor');
    }
  }

  function setPlayerFacingAngle(angle: number): void {
    if (canMove.value) playerFacingAngle.value = angle;
  }

  if (getCurrentScope()) onScopeDispose(clearTimers);

  return {
    question,
    pattern,
    cannonSolution,
    phase,
    currentStep,
    activeCells,
    dangerousCells,
    explodingSourceIds,
    removedSourceIds,
    damageRecords,
    deathRecord,
    deadActorIds,
    actorPositions,
    playerPosition,
    playerFacingAngle,
    remainingLayers,
    cannonSeconds,
    cannonImpactKey,
    cameraResetKey,
    attempts,
    successes,
    canMove,
    succeeded,
    playerLayer: computed(() => memberLayer('you')),
    start,
    retry,
    nextQuestion,
    setPlayerPosition,
    setPlayerFacingAngle,
    activeTimerCount: () => handles.size
  };
}
