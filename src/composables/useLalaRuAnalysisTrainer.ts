import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import {
  ANALYSIS_TIMING,
  LALARU_PLAYER_START,
  analysisGapCenterAngle,
  attackSourceAngle,
  generateAnalysisQuestion,
  isAttackInAnalysisGap,
  type AnalysisQuestion,
  type ArenaPoint
} from '../mechanics/lalaru/index.ts';
import { normalizeFacingAngle } from '../presentation/lalaru/player-controls.ts';

export type AnalysisPhase = 'idle' | 'active' | 'resolved';

export interface AnalysisScheduler {
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface AnalysisTrainerOptions {
  scheduler?: AnalysisScheduler;
  questionFactory?: () => AnalysisQuestion;
}

const browserScheduler: AnalysisScheduler = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: handle => clearTimeout(handle)
};

export function useLalaRuAnalysisTrainer(options: AnalysisTrainerOptions = {}) {
  const scheduler = options.scheduler ?? browserScheduler;
  const questionFactory = options.questionFactory ?? generateAnalysisQuestion;
  const question = ref<AnalysisQuestion>(questionFactory());
  const phase = ref<AnalysisPhase>('idle');
  const playerPosition = ref<ArenaPoint>({ ...LALARU_PLAYER_START });
  const playerFacingAngle = ref(0);
  const settlementPosition = ref<ArenaPoint | null>(null);
  const settlementFacingAngle = ref<number | null>(null);
  const result = ref<boolean | null>(null);
  const explosionKey = ref(0);
  const attempts = ref(0);
  const successes = ref(0);
  const handles = new Set<ReturnType<typeof setTimeout>>();
  let generation = 0;

  const canMove = computed(() => phase.value !== 'resolved');
  const sourceAngle = computed(() => attackSourceAngle(
    settlementPosition.value ?? playerPosition.value,
    question.value.orbPosition
  ));
  const gapCenterAngle = computed(() => analysisGapCenterAngle(
    settlementFacingAngle.value ?? playerFacingAngle.value,
    question.value.debuff
  ));

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

  function resolve(): void {
    if (phase.value !== 'active') return;
    clearTimers();
    settlementPosition.value = { ...playerPosition.value };
    settlementFacingAngle.value = playerFacingAngle.value;
    result.value = isAttackInAnalysisGap(
      settlementPosition.value,
      settlementFacingAngle.value,
      question.value.debuff,
      question.value.orbPosition
    );
    phase.value = 'resolved';
    explosionKey.value += 1;
    attempts.value += 1;
    if (result.value) successes.value += 1;
  }

  function start(): void {
    if (phase.value === 'active') return;
    clearTimers();
    phase.value = 'active';
    settlementPosition.value = null;
    settlementFacingAngle.value = null;
    result.value = null;
    const activeGeneration = generation;
    schedule(resolve, ANALYSIS_TIMING.resolveMs, activeGeneration);
  }

  function resetRound(nextQuestion: boolean): void {
    clearTimers();
    if (nextQuestion) question.value = questionFactory();
    phase.value = 'idle';
    playerPosition.value = { ...LALARU_PLAYER_START };
    playerFacingAngle.value = 0;
    settlementPosition.value = null;
    settlementFacingAngle.value = null;
    result.value = null;
    explosionKey.value += 1;
  }

  function retry(): void {
    resetRound(false);
  }

  function nextQuestion(): void {
    resetRound(true);
  }

  function setPlayerPosition(position: ArenaPoint): void {
    if (canMove.value) playerPosition.value = position;
  }

  function setPlayerFacingAngle(facingAngle: number): void {
    if (canMove.value) playerFacingAngle.value = normalizeFacingAngle(facingAngle);
  }

  if (getCurrentScope()) onScopeDispose(clearTimers);

  return {
    question,
    phase,
    playerPosition,
    playerFacingAngle,
    settlementPosition,
    settlementFacingAngle,
    result,
    explosionKey,
    attempts,
    successes,
    canMove,
    sourceAngle,
    gapCenterAngle,
    activeTimerCount: () => handles.size,
    start,
    resolve,
    retry,
    nextQuestion,
    setPlayerPosition,
    setPlayerFacingAngle
  };
}
