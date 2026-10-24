import type {
  ArrowSide,
  CardinalDirection,
  LalaRuQuestion,
  Multiplier,
  SelectedSide
} from './types.ts';

/** V selects the arrow side; III selects the side without arrows. */
export function selectSide(
  arrowSide: ArrowSide,
  multiplier: Multiplier
): SelectedSide {
  if (multiplier === 'V') return arrowSide;
  return arrowSide === 'left' ? 'right' : 'left';
}

const FINAL_SAFE_BY_INITIAL: Readonly<
  Record<CardinalDirection, Readonly<Record<SelectedSide, CardinalDirection>>>
> = {
  north: { left: 'east', right: 'west' },
  east: { left: 'south', right: 'north' },
  south: { left: 'west', right: 'east' },
  west: { left: 'north', right: 'south' }
};

/**
 * 玩家站在初始缺口面向 Boss 時，將所選的左／右側換算成場地方位。
 * 順時針排列 [N, E, S, W] 中，右側取 index - 1、左側取 index + 1。
 */
export function finalSafeDirection(
  initialSafe: CardinalDirection,
  selectedSide: SelectedSide
): CardinalDirection {
  return FINAL_SAFE_BY_INITIAL[initialSafe][selectedSide];
}

export function solveQuestion(question: LalaRuQuestion): {
  selectedSide: SelectedSide;
  finalSafeDirection: CardinalDirection;
} {
  const selectedSide = selectSide(question.arrowSide, question.multiplier);
  return {
    selectedSide,
    finalSafeDirection: finalSafeDirection(question.initialSafeDirection, selectedSide)
  };
}
