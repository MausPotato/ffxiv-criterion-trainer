import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import {
  LALARU_PLAYER_START,
  dotCountdownSchedule,
  generateLalaRuQuestion,
  isPointInSafeSector,
  solveQuestion,
  type ArenaPoint,
  type LalaRuMode,
  type LalaRuPhase,
  type LalaRuQuestion
} from '../mechanics/lalaru/index.ts';
import { LALARU_TIMING } from '../mechanics/lalaru/timing.ts';

export interface LalaRuScheduler {
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface LalaRuTrainerOptions {
  scheduler?: LalaRuScheduler;
  questionFactory?: () => LalaRuQuestion;
}

const browserScheduler: LalaRuScheduler = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: handle => clearTimeout(handle)
};

export function useLalaRuTrainer(options: LalaRuTrainerOptions = {}) {
  const scheduler = options.scheduler ?? browserScheduler;
  const questionFactory = options.questionFactory ?? generateLalaRuQuestion;
  const question = ref<LalaRuQuestion>(questionFactory());
  const phase = ref<LalaRuPhase>('idle');
  const mode = ref<LalaRuMode>('tutorial');
  const playerPosition = ref<ArenaPoint>({ ...LALARU_PLAYER_START });
  const settlementPosition = ref<ArenaPoint | null>(null);
  const dotCount = ref<number>(question.value.dotPattern);
  const animationKey = ref(0);
  const attempts = ref(0);
  const successes = ref(0);
  const handles = new Set<ReturnType<typeof setTimeout>>();
  let generation = 0;

  const solution = computed(() => solveQuestion(question.value));
  const displayedSafeDirection = computed(() =>
    phase.value === 'resolved'
      ? solution.value.finalSafeDirection
      : question.value.initialSafeDirection
  );
  const succeeded = computed<boolean | null>(() => {
    if (phase.value !== 'resolved' || !settlementPosition.value) return null;
    return isPointInSafeSector(settlementPosition.value, solution.value.finalSafeDirection);
  });
  const canMove = computed(() => phase.value !== 'resolved');

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

  function start(): void {
    if (phase.value === 'casting') return;
    clearTimers();
    phase.value = 'casting';
    settlementPosition.value = null;
    dotCount.value = question.value.dotPattern;
    animationKey.value += 1;
    const activeGeneration = generation;

    for (const step of dotCountdownSchedule(question.value.dotPattern)) {
      schedule(() => { dotCount.value = step.count; }, step.atMs, activeGeneration);
    }
    schedule(() => {
      settlementPosition.value = { ...playerPosition.value };
      phase.value = 'resolved';
      attempts.value += 1;
      if (isPointInSafeSector(settlementPosition.value, solution.value.finalSafeDirection)) {
        successes.value += 1;
      }
    }, LALARU_TIMING.resolveMs, activeGeneration);
  }

  function retry(): void {
    clearTimers();
    phase.value = 'idle';
    playerPosition.value = { ...LALARU_PLAYER_START };
    settlementPosition.value = null;
    dotCount.value = question.value.dotPattern;
    animationKey.value += 1;
  }

  function nextQuestion(): void {
    clearTimers();
    question.value = questionFactory();
    phase.value = 'idle';
    playerPosition.value = { ...LALARU_PLAYER_START };
    settlementPosition.value = null;
    dotCount.value = question.value.dotPattern;
    animationKey.value += 1;
  }

  function setPlayerPosition(position: ArenaPoint): void {
    if (!canMove.value) return;
    playerPosition.value = position;
  }

  function setMode(nextMode: LalaRuMode): void {
    mode.value = nextMode;
  }

  if (getCurrentScope()) onScopeDispose(clearTimers);

  return {
    question,
    phase,
    mode,
    playerPosition,
    settlementPosition,
    dotCount,
    animationKey,
    attempts,
    successes,
    solution,
    displayedSafeDirection,
    succeeded,
    canMove,
    activeTimerCount: () => handles.size,
    start,
    retry,
    nextQuestion,
    setPlayerPosition,
    setMode
  };
}
