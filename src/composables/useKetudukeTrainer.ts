import { computed, ref } from 'vue';
import type { Role } from '../domain/roles.ts';
import { generateQuestion } from '../mechanics/ketuduke/generation.ts';
import type { KetudukeQuestion, TrainerPhase } from '../mechanics/ketuduke/types.ts';

export interface TrainerSettings {
  timed: boolean;
  showWind: boolean;
}

export interface DeathDialogState {
  open: boolean;
  reason: string;
}

export function useKetudukeTrainer() {
  const question = ref<KetudukeQuestion>(generateQuestion());
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

  const stageName = computed(() => {
    if (!ready.value) return '準備中';
    return ['第一階段：排隊', '第二階段：吹風前站位', '第三階段：吹風結算'][phase.value];
  });

  function selectRole(role: Role | null): void {
    focus.value = role;
    status.value = role
      ? `已選 ${role}。從左側場地開始練習。`
      : '請先選擇角色，再從場地中央開始練習。';
  }

  function start(): void {
    if (!focus.value || ready.value) return;
    ready.value = true;
    phase.value = 0;
    status.value = '水晶與 Buff 已出現。互動判定將於下一階段接入。';
  }

  function newQuestion(): void {
    question.value = generateQuestion();
    round.value += 1;
    ready.value = false;
    phase.value = 0;
    death.value = { open: false, reason: '' };
    status.value = focus.value
      ? `新題目已準備，${focus.value} 請從場地中央開始。`
      : '新題目已準備，請先選擇角色。';
  }

  function closeDeath(): void {
    death.value.open = false;
  }

  return {
    question,
    focus,
    ready,
    phase,
    round,
    wins,
    streak,
    hintVisible,
    settings,
    death,
    status,
    stageName,
    selectRole,
    start,
    newQuestion,
    closeDeath
  };
}
