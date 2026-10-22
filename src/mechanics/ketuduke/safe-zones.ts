import { toCellIndex, toCoordinate } from '../../domain/grid.ts';
import type { CellIndex } from '../../domain/grid.ts';
import type { CenterCrystal } from './types.ts';

export function referenceSafeZones(center: CenterCrystal): Set<CellIndex> {
  const colPair = center.c === 1 ? [0, 2] : [1, 3];
  const rowPair = center.r === 1 ? [0, 2] : [1, 3];
  const safe = new Set<CellIndex>();

  if (center.o === 'h') {
    for (const r of [0, 3]) {
      for (const c of colPair) safe.add(toCellIndex(r, c));
    }
  } else {
    for (const r of rowPair) {
      for (const c of [0, 3]) safe.add(toCellIndex(r, c));
    }
  }

  return safe;
}

export function safeRowsAndColumns(center: CenterCrystal): {
  rows: Set<number>;
  columns: Set<number>;
} {
  const safe = referenceSafeZones(center);
  return {
    rows: new Set([...safe].map(cell => toCoordinate(cell).r)),
    columns: new Set([...safe].map(cell => toCoordinate(cell).c))
  };
}
