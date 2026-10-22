import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import type { CellIndex } from '../domain/grid.ts';
import { ROLES, type Role } from '../domain/roles.ts';
import { generateQuestion } from '../mechanics/ketuduke/generation.ts';
import { autoQueue, queueError, queueLine, wantedMahjongRegion } from '../mechanics/ketuduke/queue.ts';
import { groupCheck, prePositionError, solveParty } from '../mechanics/ketuduke/solver.ts';
import {
  crystalMotionPlan,
  hazardCells,
  validateCrystalGeometry
} from '../mechanics/ketuduke/crystals.ts';
import { referenceSafeZones } from '../mechanics/ketuduke/safe-zones.ts';
import { simulatePlayerWindStep } from '../mechanics/ketuduke/wind.ts';
import {
  WIND_ACTOR_START_DELAY_MS,
  WIND_ROUND_DURATION_MS,
  windEffectsForStep
} from '../presentation/ketuduke/wind-effects.ts';
import type {
  CompletePlayerPositions,
  Crystal,
  CrystalMotionPlan,
  KetudukeQuestion,
  MahjongRegion,
  PlayerPositions,
  TrainerPhase,
  WindStep
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

export interface SettlementState {
  personalPosition: CellIndex;
  personalSafe: boolean;
  groupOk: boolean;
  groupDetail: string;
  geometryOk: boolean;
  allPlayersSafe: boolean;
  valid: boolean;
  summary: string;
  limitation: string;
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
  const playerFinal = ref<CompletePlayerPositions | null>(null);
  const crystalFinal = ref<Crystal[]>([]);
  const replayActive = ref(false);
  const windStep = ref<WindStep | null>(null);
  const review = ref(false);
  const settlement = ref<SettlementState | null>(null);
  const elapsedMs = ref(0);
  const queueStartedAtMs = ref<number | null>(null);
  const queueDeadlineAtMs = ref<number | null>(null);
  const preStartedAtMs = ref<number | null>(null);
  const preDeadlineAtMs = ref<number | null>(null);
  let timerHandle: ReturnType<typeof setTimeout> | null = null;
  let timerGeneration = 0;
  const replayHandles = new Set<ReturnType<typeof setTimeout>>();
  let replayGeneration = 0;
  let replayCrystalPlan: CrystalMotionPlan | null = null;

  const stageName = computed(() => {
    if (!ready.value) return '準備中';
    if (phase.value === 2) return review.value ? '第三階段：吹風結算' : '第三階段：吹風回放';
    return ['第一階段：排隊', '第二階段：吹風前站位'][phase.value];
  });
  const stageBadge = computed(() => ready.value ? `階段 ${phase.value + 1}／3` : '準備階段');
  const clockText = computed(() => {
    if (!ready.value) return '⏸ WAITING';
    if (windStep.value === 1) return '① 橫向吹風';
    if (windStep.value === 2) return '② 縱向吹風';
    if (review.value) return '✓ SETTLED';
    if (!settings.value.timed) return '∞ PRACTICE';
    return `${(elapsedMs.value / 1_000).toFixed(1)} / 5.0`;
  });
  const progress = computed(() => {
    if (!ready.value) return 0;
    if (phase.value === 2) return review.value ? 100 : windStep.value === 2 ? 75 : 50;
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
    if (phase.value === 2) return playerFinal.value?.[focus.value];
    return pre.value[focus.value] ?? queue.value[focus.value];
  });
  const visiblePositions = computed<PlayerPositions>(() => {
    if (phase.value === 2 && review.value && playerFinal.value) return playerFinal.value;
    if (!focus.value || displayPosition.value === undefined) return {};
    return { [focus.value]: displayPosition.value };
  });
  const visibleCrystals = computed<Crystal[]>(() =>
    phase.value === 2 ? crystalFinal.value : question.value.crystals
  );
  const safeCells = computed<CellIndex[]>(() =>
    review.value ? [...referenceSafeZones(question.value.center)] : []
  );
  const windEffects = computed(() =>
    windStep.value ? windEffectsForStep(question.value, windStep.value) : []
  );
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
  const confirmText = computed(() =>
    phase.value === 0 ? '確認排隊' : phase.value === 1 ? '確認站位' : replayActive.value ? '略過動畫' : '下一題'
  );
  const confirmDisabled = computed(() =>
    phase.value === 2 ? !replayActive.value && !review.value : !interactive.value || !focus.value
  );
  const nextDisabled = computed(() =>
    !ready.value || settings.value.timed || phase.value !== 0 || !hasChecked.value || mahVisible.value
  );
  const resetDisabled = computed(() => !ready.value || (phase.value < 2 && lockPosition.value));
  const resetText = computed(() => phase.value === 2 ? '重試本題' : '重設本階段');

  function cancelTimer(): void {
    timerGeneration += 1;
    if (timerHandle !== null) {
      scheduler.clearTimeout(timerHandle);
      timerHandle = null;
    }
  }

  function cancelReplay(): void {
    replayGeneration += 1;
    for (const handle of replayHandles) scheduler.clearTimeout(handle);
    replayHandles.clear();
    replayActive.value = false;
    windStep.value = null;
    replayCrystalPlan = null;
  }

  function scheduleReplay(callback: () => void, delay: number, generation: number): void {
    const handle = scheduler.setTimeout(() => {
      replayHandles.delete(handle);
      if (generation !== replayGeneration) return;
      callback();
    }, delay);
    replayHandles.add(handle);
  }

  function clearResolution(): void {
    cancelReplay();
    playerFinal.value = null;
    crystalFinal.value = [];
    review.value = false;
    settlement.value = null;
  }

  function finishSettlement(modelAvailable = true): void {
    if (!focus.value || !playerFinal.value) return;
    const hazards = hazardCells(crystalFinal.value);
    const unsafeRoles = ROLES.filter(role => hazards.has(playerFinal.value![role]));
    const geometry = validateCrystalGeometry(question.value, crystalFinal.value);
    const group = groupCheck(question.value, playerFinal.value);
    const personalPosition = playerFinal.value[focus.value];
    const geometryOk = modelAvailable && geometry.ok;
    const valid = geometryOk && unsafeRoles.length === 0 && group.ok;

    replayActive.value = false;
    windStep.value = null;
    review.value = true;
    if (valid) {
      wins.value += 1;
      streak.value += 1;
    } else {
      streak.value = 0;
    }

    const summary = valid
      ? '水晶攻擊範圍與分組檢查通過。'
      : !geometryOk
        ? `水晶動畫模型未通過：${modelAvailable ? geometry.reason : '無法求得標準最終配置'}。本次不判定玩家死亡。`
        : '模擬結算未通過安全區或分組檢查；本次不判定玩家死亡。';
    settlement.value = {
      personalPosition,
      personalSafe: !hazards.has(personalPosition),
      groupOk: group.ok,
      groupDetail: group.detail,
      geometryOk,
      allPlayersSafe: unsafeRoles.length === 0,
      valid,
      summary,
      limitation: '四顆水晶依①／②象限風向逐輪位移；若最終幾何不符合攻略八種安全區，會標示模型未通過且不判定玩家死亡，不會校正水晶座標。'
    };
    status.value = valid ? `✅ ② 吹風結算完成：${summary}` : `⚠️ ② 吹風結算完成：${summary}`;
  }

  function applyWindStep(step: WindStep): void {
    if (!playerFinal.value || !replayCrystalPlan) return;
    playerFinal.value = simulatePlayerWindStep(question.value, playerFinal.value, step);
    crystalFinal.value = (step === 1 ? replayCrystalPlan.middle : replayCrystalPlan.target)
      .map(crystal => ({ ...crystal }));
  }

  function completeReplayImmediately(): void {
    if (!playerFinal.value || !replayCrystalPlan) return;
    const plan = replayCrystalPlan;
    cancelReplay();
    playerFinal.value = simulatePlayerWindStep(
      question.value,
      simulatePlayerWindStep(question.value, pre.value as CompletePlayerPositions, 1),
      2
    );
    crystalFinal.value = plan.target.map(crystal => ({ ...crystal }));
    finishSettlement();
  }

  function beginWindReplay(solution: CompletePlayerPositions): void {
    cancelReplay();
    review.value = false;
    settlement.value = null;
    playerFinal.value = { ...solution };
    crystalFinal.value = question.value.crystals.map(crystal => ({ ...crystal }));
    replayCrystalPlan = crystalMotionPlan(question.value);
    if (!replayCrystalPlan) {
      playerFinal.value = simulatePlayerWindStep(
        question.value,
        simulatePlayerWindStep(question.value, solution, 1),
        2
      );
      finishSettlement(false);
      return;
    }
    if (!settings.value.showWind) {
      completeReplayImmediately();
      return;
    }

    replayActive.value = true;
    windStep.value = 1;
    status.value = '① 橫向吹風回放：泡泡角色與水晶開始移動。';
    const generation = replayGeneration;
    scheduleReplay(() => applyWindStep(1), WIND_ACTOR_START_DELAY_MS, generation);
    scheduleReplay(() => {
      windStep.value = 2;
      status.value = '② 縱向吹風回放：從第一輪落點繼續移動。';
      applyWindStep(2);
    }, WIND_ROUND_DURATION_MS, generation);
    scheduleReplay(finishSettlement, WIND_ROUND_DURATION_MS * 2, generation);
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
    cancelTimer();
    beginWindReplay(solution.pre);
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

  function settleExpiredStage(): boolean {
    if (!settings.value.timed || !ready.value || death.value.open || phase.value >= 2) {
      return false;
    }

    const expectedPhase = phase.value as 0 | 1;
    const startedAt = expectedPhase === 0 ? queueStartedAtMs.value : preStartedAtMs.value;
    const deadlineAt = expectedPhase === 0 ? queueDeadlineAtMs.value : preDeadlineAtMs.value;
    if (startedAt === null || deadlineAt === null || scheduler.now() < deadlineAt) {
      return false;
    }

    elapsedMs.value = STAGE_DURATION_MS;
    if (expectedPhase === 0) checkQueue();
    else checkPrePosition();
    return true;
  }

  function selectRole(role: Role | null): void {
    if (lockPosition.value) return;
    focus.value = role;
    if (ready.value) {
      clearResolution();
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
    clearResolution();
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
    if (settleExpiredStage()) return;
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
    if (settleExpiredStage()) return;
    if (phase.value === 0) checkQueue();
    else if (phase.value === 1) checkPrePosition();
    else if (phase.value === 2 && replayActive.value) completeReplayImmediately();
    else if (phase.value === 2 && review.value) newQuestion();
  }

  function nextStep(): void {
    if (nextDisabled.value) return;
    mahVisible.value = true;
    enterPrePosition();
  }

  function resetStage(): void {
    if (resetDisabled.value) return;
    if (phase.value === 2) {
      retry();
      return;
    }
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
    clearResolution();
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
    clearResolution();
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
    if (!value && replayActive.value) completeReplayImmediately();
  }

  if (getCurrentScope()) onScopeDispose(() => {
    cancelTimer();
    cancelReplay();
  });

  return {
    question, focus, ready, phase, round, wins, streak, hintVisible, settings, death, status,
    queue, pre, mahVisible, hasChecked, preConfirmed, lockPosition, elapsedMs,
    playerFinal, crystalFinal, replayActive, windStep, review, settlement,
    stageStartedAtMs, stageDeadlineAtMs,
    queueStartedAtMs, queueDeadlineAtMs, preStartedAtMs, preDeadlineAtMs,
    stageName, stageBadge, clockText, progress, displayPosition, visiblePositions, visibleCrystals,
    safeCells, windEffects, mahjongRunHint, interactive,
    confirmText, confirmDisabled, nextDisabled, resetDisabled, resetText,
    queueCells: computed(() => queueLine(question.value)),
    selectRole, start, selectCell, confirm, nextStep, resetStage, newQuestion, retry,
    closeDeath, toggleHint, setTimed, setShowWind
  };
}
