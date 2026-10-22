import { toCellIndex, toCoordinate, type Quadrant } from '../../domain/grid.ts';
import { mahjongRegion } from '../../mechanics/ketuduke/queue.ts';
import { pushAt } from '../../mechanics/ketuduke/wind.ts';
import type {
  KetudukeQuestion,
  MahjongRegion,
  WindStep
} from '../../mechanics/ketuduke/types.ts';

export const WIND_MOVE_DURATION_MS = 1_000;
export const WIND_HOLD_DURATION_MS = 500;
export const WIND_ROUND_DURATION_MS = WIND_MOVE_DURATION_MS + WIND_HOLD_DURATION_MS;
export const WIND_REPLAY_DURATION_MS = WIND_ROUND_DURATION_MS * 2;
export const WIND_ACTOR_START_DELAY_MS = 0;
export const WIND_ACTOR_MOVE_DURATION_MS = WIND_MOVE_DURATION_MS;

export type WindDirection = 'left' | 'right' | 'up' | 'down';

export interface QuadrantWindEffect {
  quadrant: Quadrant;
  region: MahjongRegion;
  step: WindStep;
  direction: WindDirection;
  durationMs: number;
}

const QUADRANT_ANCHORS = [
  { quadrant: 0, r: 1, c: 1 },
  { quadrant: 1, r: 1, c: 2 },
  { quadrant: 2, r: 2, c: 1 },
  { quadrant: 3, r: 2, c: 2 }
] as const;

export function windEffectsForStep(
  question: KetudukeQuestion,
  step: WindStep
): QuadrantWindEffect[] {
  return QUADRANT_ANCHORS.flatMap(({ quadrant, r, c }) => {
    const region = mahjongRegion(question, r, c);
    if (region !== step) return [];

    const destination = toCoordinate(
      pushAt(toCellIndex(r, c), step, question.rotation)
    );
    const direction: WindDirection = step === 1
      ? destination.c < c ? 'left' : 'right'
      : destination.r < r ? 'up' : 'down';

    return [{
      quadrant,
      region,
      step,
      direction,
      durationMs: WIND_ROUND_DURATION_MS
    }];
  });
}

export function quadrantWindCues(question: KetudukeQuestion): QuadrantWindEffect[] {
  return [
    ...windEffectsForStep(question, 1),
    ...windEffectsForStep(question, 2)
  ].sort((left, right) => left.quadrant - right.quadrant);
}
