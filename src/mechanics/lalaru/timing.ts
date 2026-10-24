// 暫定演出值；尚未依實戰影片校正，不應視為正式戰鬥時間軸。
export const LALARU_TIMING = {
  ringRotationMs: 1_200,
  dotFirstChangeMs: 1_000,
  dotStepMs: 1_000,
  resolveMs: 5_200
} as const;

export function dotCountdownSchedule(startCount: 3 | 5): readonly { atMs: number; count: number }[] {
  return Array.from({ length: startCount - 1 }, (_, index) => ({
    atMs: LALARU_TIMING.dotFirstChangeMs + index * LALARU_TIMING.dotStepMs,
    count: startCount - index - 1
  }));
}
