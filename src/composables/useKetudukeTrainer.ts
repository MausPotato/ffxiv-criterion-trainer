import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import type { CellIndex } from '../domain/grid.ts';
import { ROLES, type Role } from '../domain/roles.ts';
import { generateQuestion } from '../mechanics/ketuduke/generation.ts';
import { autoQueue, queueError, queueLine, wantedMahjongRegion } from '../mechanics/ketuduke/queue.ts';
import { prePositionError, solveParty } from '../mechanics/ketuduke/solver.ts';
import type {
  KetudukeQuestion,
  MahjongRegion,
  PlayerPositions,
  TrainerPhase
} from '../mechanics/ketuduke/types.ts';

const TIMER_POLL_MS = 80;
const STAGE_DURATION_MS = 5_000;

export interface TrainerSettings {
  timed: boolean;
  showWind: boolean;
}

export interface DeathDialogState {
  open: boolean;
  reason: string;
}

export interface TrainerScheduler {
  now: () => number;
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface KetudukeTrainerOptions {
  scheduler?: TrainerScheduler;
  questionFactory?: () => KetudukeQuestion;
}

export interface MahjongRunHint {
  bubble: MahjongRegion;
  bind: MahjongRegion;
}

const browserScheduler: TrainerScheduler = {
  now: () => Date.now(),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: handle => clearTimeout(handle)
};

export function useKetudukeTrainer(options: KetudukeTrainerOptions = {}) {
  const scheduler = options.scheduler ?? browserScheduler;
  const questionFactory = options.questionFactory ?? generateQuestion;
  const question = ref<KetudukeQuestion>(questionFactory());
  const focus = ref<Role | null>(null);
  const ready = ref(false);
  const phase = ref<TrainerPhase>(0);
  const round = ref(1);
  const wins = ref(0);
  const streak = ref(0);
  const hintVisible = ref(false);
  const settings = ref<TrainerSettings>({ timed: true, showWind: true });
  const death = ref<DeathDialogState>({ open: false, reason: '' });
  const status = ref('請先選擇角色，再從場地中央開始練習。');
  const queue = ref<PlayerPositions>({});
  const pre = ref<PlayerPositions>({});
  const mahVisible = ref(false);
  const hasChecked = ref(false);
  const preConfirmed = ref(false);
  const lockPosition = ref(false);
  const elapsedMs = ref(0);
  const queueStartedAtMs = ref<number | null>(null);
  const queueDeadlineAtMs = ref<number | null>(null);
  const preStartedAtMs = ref<number | null>(null);
  const preDeadlineAtMs = ref<number | null>(null);
  let timerHandle: ReturnType<typeof setTimeout> | null = null;
  let timerGeneration = 0;

  const stageName = computed(() => {
    if (!ready.value) return '準備中';
    return ['第一階段：排隊', '第二階段：吹風前站位', '第三階段：等待吹風'][phase.value];
  });
  const stageBadge = computed(() => ready.value ? `階段 ${phase.value + 1}／3` : '準備階段');
  const clockText = computed(() => {
    if (!ready.value) return '⏸ WAITING';
    if (!settings.value.timed) return '∞ PRACTICE';
    return `${(elapsedMs.value / 1_000).toFixed(1)} / 5.0`;
  });
  const progress = computed(() => {
    if (!ready.value) return 0;
    if (settings.value.timed) return Math.min(100, elapsedMs.value / STAGE_DURATION_MS * 100);
    return phase.value * 50;
  });
  const stageStartedAtMs = computed(() =>
    phase.value === 0 ? queueStartedAtMs.value : preStartedAtMs.value
  );
  const stageDeadlineAtMs = computed(() =>
    phase.value === 0 ? queueDeadlineAtMs.value : preDeadlineAtMs.value
  );
  const displayPosition = computed<CellIndex | undefined>(() => {
    if (!focus.value) return undefined;
    if (phase.value === 0) return queue.value[focus.value];
    return pre.value[focus.value] ?? queue.value[focus.value];
  });
  const visiblePositions = computed<PlayerPositions>(() => {
    if (!focus.value || displayPosition.value === undefined) return {};
    return { [focus.value]: displayPosition.value };
  });
  const mahjongRunHint = computed<MahjongRunHint | null>(() => {
    if (!ready.value || !mahVisible.value) return null;
    const bubbleRole = ROLES.find(role => question.value.buffs[role] === 'bubble');
    const bindRole = ROLES.find(role => question.value.buffs[role] === 'bind');
    if (!bubbleRole || !bindRole) return null;
    return {
      bubble: wantedMahjongRegion(question.value, bubbleRole),
      bind: wantedMahjongRegion(question.value, bindRole)
    };
  });
  const interactive = computed(() =>
    ready.value
    && !death.value.open
    && !lockPosition.value
    && phase.value < 2
    && !(phase.value === 0 && hasChecked.value)
  );
  const confirmText = computed(() => phase.value === 0 ? '確認排隊' : '確認站位');
  const confirmDisabled = computed(() => !interactive.value || !focus.value);
  const nextDisabled = computed(() =>
    !ready.value || settings.value.timed || phase.value !== 0 || !hasChecked.value || mahVisible.value
  );
  const resetDisabled = computed(() => !ready.value || lockPosition.value || phase.value === 2);

  function cancelTimer(): void {
    timerGeneration += 1;
    if (timerHandle !== null) {
      scheduler.clearTimeout(timerHandle);
      timerHandle = null;
    }
  }

  function startStageTimer(expectedPhase: 0 | 1): void {
    cancelTimer();
    const startedAt = scheduler.now();
    if (expectedPhase === 0) {
      queueStartedAtMs.value = startedAt;
      queueDeadlineAtMs.value = startedAt + STAGE_DURATION_MS;
    } else {
      preStartedAtMs.value = startedAt;
      preDeadlineAtMs.value = startedAt + STAGE_DURATION_MS;
    }
    elapsedMs.value = 0;
    const generation = timerGeneration;
    timerHandle = scheduler.setTimeout(
      () => timerTick(generation, expectedPhase),
      TIMER_POLL_MS
    );
  }

  function fail(reason: string): void {
    cancelTimer();
    lockPosition.value = true;
    streak.value = 0;
    death.value = { open: true, reason };
    status.value = reason;
  }

  function enterPrePosition(): void {
    if (phase.value !== 0 || !hasChecked.value || !mahVisible.value) return;
    phase.value = 1;
    pre.value = {};
    preConfirmed.value = false;
    status.value = settings.value.timed
      ? '麻將已揭示。第二階段開始，請在 5 秒內移動到吹風前站位。'
      : '麻將已揭示。請移動一格到自己的吹風前站位。';
    if (settings.value.timed) startStageTimer(1);
  }

  function checkQueue(): boolean {
    if (!focus.value || phase.value !== 0 || hasChecked.value) return false;
    const error = queueError(question.value, focus.value, queue.value[focus.value]);
    if (error) {
      fail(error);
      return false;
    }
    queue.value = autoQueue(question.value);
    hasChecked.value = true;
    if (settings.value.timed) mahVisible.value = true;
    status.value = mahVisible.value
      ? '排隊正確，答案已鎖定。'
      : '排隊正確，答案已鎖定；請揭示麻將。';
    enterPrePosition();
    return true;
  }

  function checkPrePosition(): boolean {
    if (!focus.value || phase.value !== 1) return false;
    const selected = pre.value[focus.value];
    const result = prePositionError(question.value, focus.value, selected);
    if (result) {
      if (result.type === 'simulator') {
        status.value = result.error;
        return false;
      }
      fail(result.error);
      return false;
    }
    const solution = solveParty(question.value, focus.value, selected ?? null);
    if (!solution) {
      status.value = '隊友模擬找不到合法的整隊站位；此題暫停結算。';
      return false;
    }
    pre.value = solution.pre;
    preConfirmed.value = true;
    phase.value = 2;
    lockPosition.value = true;
    status.value = '吹風前站位正確。吹風結算與動畫將於下一部分接入。';
    cancelTimer();
    return true;
  }

  function timerTick(generation: number, expectedPhase: 0 | 1): void {
    if (
      generation !== timerGeneration
      || !ready.value
      || death.value.open
      || phase.value !== expectedPhase
    ) return;

    timerHandle = null;
    const now = scheduler.now();
    const startedAt = expectedPhase === 0 ? queueStartedAtMs.value : preStartedAtMs.value;
    const deadlineAt = expectedPhase === 0 ? queueDeadlineAtMs.value : preDeadlineAtMs.value;
    if (startedAt === null || deadlineAt === null) return;
    elapsedMs.value = Math.min(STAGE_DURATION_MS, now - startedAt);

    if (now >= deadlineAt) {
      if (expectedPhase === 0) checkQueue();
      else checkPrePosition();
      return;
    }

    const remaining = deadlineAt - now;
    timerHandle = scheduler.setTimeout(
      () => timerTick(generation, expectedPhase),
      Math.min(TIMER_POLL_MS, remaining)
    );
  }

  function selectRole(role: Role | null): void {
    if (lockPosition.value) return;
    focus.value = role;
    if (ready.value) {
      queue.value = {};
      pre.value = {};
      mahVisible.value = false;
      hasChecked.value = false;
      preConfirmed.value = false;
      preStartedAtMs.value = null;
      preDeadlineAtMs.value = null;
      phase.value = 0;
      if (settings.value.timed) startStageTimer(0);
    }
    status.value = role
      ? ready.value ? `已切換為 ${role}，請重新選擇排隊位置。` : `已選 ${role}。從左側場地開始練習。`
      : '請先選擇角色，再從場地中央開始練習。';
  }

  function start(): void {
    if (!focus.value || ready.value) return;
    cancelTimer();
    ready.value = true;
    phase.value = 0;
    queue.value = {};
    pre.value = {};
    mahVisible.value = false;
    hasChecked.value = false;
    preConfirmed.value = false;
    lockPosition.value = false;
    elapsedMs.value = 0;
    queueStartedAtMs.value = null;
    queueDeadlineAtMs.value = null;
    preStartedAtMs.value = null;
    preDeadlineAtMs.value = null;
    death.value = { open: false, reason: '' };
    status.value = settings.value.timed
      ? '計時開始：請在前 5 秒選擇自己的排隊位置。'
      : '自由練習：請選擇自己的排隊位置並確認。';
    if (settings.value.timed) startStageTimer(0);
  }

  function selectCell(cell: CellIndex): void {
    if (!interactive.value || !focus.value) return;
    if (phase.value === 0) {
      queue.value = { [focus.value]: cell };
      status.value = '已選擇排隊位置，按「確認排隊」送出。';
    } else if (phase.value === 1) {
      pre.value = { [focus.value]: cell };
      status.value = '已選擇吹風前站位，按「確認站位」送出。';
    }
  }

  function confirm(): void {
    if (phase.value === 0) checkQueue();
    else if (phase.value === 1) checkPrePosition();
  }

  function nextStep(): void {
    if (nextDisabled.value) return;
    mahVisible.value = true;
    enterPrePosition();
  }

  function resetStage(): void {
    if (resetDisabled.value) return;
    if (phase.value === 0) {
      queue.value = {};
      hasChecked.value = false;
      status.value = '排隊位置已重設。';
    } else {
      pre.value = {};
      preConfirmed.value = false;
      status.value = '吹風前站位已重設。';
    }
  }

  function newQuestion(): void {
    cancelTimer();
    question.value = questionFactory();
    round.value += 1;
    ready.value = false;
    phase.value = 0;
    queue.value = {};
    pre.value = {};
    mahVisible.value = false;
    hasChecked.value = false;
    preConfirmed.value = false;
    lockPosition.value = false;
    elapsedMs.value = 0;
    queueStartedAtMs.value = null;
    queueDeadlineAtMs.value = null;
    preStartedAtMs.value = null;
    preDeadlineAtMs.value = null;
    death.value = { open: false, reason: '' };
    status.value = focus.value
      ? `新題目已準備，${focus.value} 請從場地中央開始。`
      : '新題目已準備，請先選擇角色。';
  }

  function retry(): void {
    cancelTimer();
    ready.value = true;
    phase.value = 0;
    queue.value = {};
    pre.value = {};
    mahVisible.value = false;
    hasChecked.value = false;
    preConfirmed.value = false;
    lockPosition.value = false;
    elapsedMs.value = 0;
    queueStartedAtMs.value = null;
    queueDeadlineAtMs.value = null;
    preStartedAtMs.value = null;
    preDeadlineAtMs.value = null;
    death.value = { open: false, reason: '' };
    status.value = settings.value.timed
      ? '重試目前題目：請在 5 秒內完成排隊。'
      : '重試目前題目：請選擇自己的排隊位置。';
    if (settings.value.timed) startStageTimer(0);
  }

  function closeDeath(): void {
    death.value.open = false;
  }

  function toggleHint(): void {
    hintVisible.value = !hintVisible.value;
  }

  function setTimed(value: boolean): void {
    if (settings.value.timed === value) return;
    settings.value = { ...settings.value, timed: value };
    if (ready.value) newQuestion();
  }

  function setShowWind(value: boolean): void {
    settings.value = { ...settings.value, showWind: value };
  }

  if (getCurrentScope()) onScopeDispose(cancelTimer);

  return {
    question, focus, ready, phase, round, wins, streak, hintVisible, settings, death, status,
    queue, pre, mahVisible, hasChecked, preConfirmed, lockPosition, elapsedMs,
    stageStartedAtMs, stageDeadlineAtMs,
    queueStartedAtMs, queueDeadlineAtMs, preStartedAtMs, preDeadlineAtMs,
    stageName, stageBadge, clockText, progress, displayPosition, visiblePositions, mahjongRunHint, interactive,
    confirmText, confirmDisabled, nextDisabled, resetDisabled,
    queueCells: computed(() => queueLine(question.value)),
    selectRole, start, selectCell, confirm, nextStep, resetStage, newQuestion, retry,
    closeDeath, toggleHint, setTimed, setShowWind
  };
}
