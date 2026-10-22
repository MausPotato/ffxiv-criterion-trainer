import { clampGridCoordinate, toCellIndex, toCoordinate } from '../../domain/grid.ts';
import { ROLES } from '../../domain/roles.ts';
import type { CellIndex } from '../../domain/grid.ts';
import type { CompletePlayerPositions, Crystal, KetudukeQuestion, WindStep } from './types.ts';

export function pushAt(
  position: CellIndex,
  step: WindStep,
  rotation: KetudukeQuestion['rotation']
): CellIndex {
  const { r, c } = toCoordinate(position);
  const clockwise = rotation === 'cw';

  if (step === 1) {
    const dc = (r < 2 ? 1 : -1) * (clockwise ? 1 : -1);
    return toCellIndex(r, clampGridCoordinate(c + dc * 2));
  }

  const dr = (c < 2 ? -1 : 1) * (clockwise ? 1 : -1);
  return toCellIndex(clampGridCoordinate(r + dr * 2), c);
}

export function projectedEnd(
  question: KetudukeQuestion,
  role: keyof CompletePlayerPositions,
  from: CellIndex
): CellIndex {
  return question.buffs[role] === 'bubble'
    ? pushAt(pushAt(from, 1, question.rotation), 2, question.rotation)
    : from;
}

export function simulatePlayerWindStep(
  question: KetudukeQuestion,
  positions: CompletePlayerPositions,
  step: WindStep
): CompletePlayerPositions {
  const result = { ...positions };
  for (const role of ROLES) {
    if (question.buffs[role] === 'bubble') {
      result[role] = pushAt(result[role], step, question.rotation);
    }
  }
  return result;
}

export function simulateCrystalWindStep(
  question: KetudukeQuestion,
  crystals: Crystal[],
  step: WindStep
): Crystal[] {
  const activeOrientation = step === 1 ? 'h' : 'v';
  return crystals.map(crystal => {
    if (crystal.o !== activeOrientation) return { ...crystal };
    const { r, c } = toCoordinate(
      pushAt(toCellIndex(crystal.r, crystal.c), step, question.rotation)
    );
    return { ...crystal, r, c };
  });
}
