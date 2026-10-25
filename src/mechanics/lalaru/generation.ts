import type {
  ArrowSide,
  CardinalDirection,
  LalaRuQuestion,
  Multiplier,
  RotationMultiplicationCue
} from './types.ts';

export type RandomSource = () => number;

function pick<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)]!;
}

export function generateLalaRuQuestion(random: RandomSource = Math.random): LalaRuQuestion {
  return {
    // Keep the established random draw order for first-mechanic questions.
    initialSafeDirection: pick<CardinalDirection>(['north', 'east', 'south', 'west'], random),
    ...generateRotationMultiplicationCue(random)
  };
}

export function generateRotationMultiplicationCue(
  random: RandomSource = Math.random
): RotationMultiplicationCue {
  return {
    arrowSide: pick<ArrowSide>(['left', 'right'], random),
    multiplier: pick<Multiplier>(['III', 'V'], random),
    // The countdown-dot pattern is independent from the III/V multiplier.
    dotPattern: 5
  };
}
