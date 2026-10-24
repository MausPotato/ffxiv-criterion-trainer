import type {
  ArrowSide,
  CardinalDirection,
  LalaRuQuestion,
  Multiplier
} from './types.ts';

export type RandomSource = () => number;

function pick<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)]!;
}

export function generateLalaRuQuestion(random: RandomSource = Math.random): LalaRuQuestion {
  return {
    initialSafeDirection: pick<CardinalDirection>(['north', 'east', 'south', 'west'], random),
    arrowSide: pick<ArrowSide>(['left', 'right'], random),
    multiplier: pick<Multiplier>(['III', 'V'], random),
    // 白點固定從五開始倒數，且不從 III/V 推導。
    dotPattern: 5
  };
}
