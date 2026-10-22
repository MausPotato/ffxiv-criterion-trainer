import { GRID_SIZE, quadrantOf, toCellIndex, toCoordinate } from '../../domain/grid.ts';
import type { CellIndex } from '../../domain/grid.ts';
import { referenceSafeZones } from './safe-zones.ts';
import type { Crystal, CrystalMotionPlan, KetudukeQuestion } from './types.ts';

export function hazardCells(crystals: Crystal[]): Set<CellIndex> {
  const hazards = new Set<CellIndex>();
  for (const crystal of crystals) {
    if (crystal.o === 'h') {
      for (let r = 0; r < GRID_SIZE; r++) hazards.add(toCellIndex(r, crystal.c));
    } else {
      for (let c = 0; c < GRID_SIZE; c++) hazards.add(toCellIndex(crystal.r, c));
    }
  }
  return hazards;
}

export function canonicalCrystalFinal(question: KetudukeQuestion): Crystal[] | null {
  const safe = referenceSafeZones(question.center);
  const safeCols = new Set([...safe].map(cell => toCoordinate(cell).c));
  const safeRows = new Set([...safe].map(cell => toCoordinate(cell).r));
  const unsafeCols = [0, 1, 2, 3].filter(c => !safeCols.has(c));
  const unsafeRows = [0, 1, 2, 3].filter(r => !safeRows.has(r));
  const fixed = quadrantOf(question.center.r, question.center.c);
  const objects = question.crystals.map(crystal => ({ ...crystal }));
  const center = objects.find(crystal => crystal.q === fixed);

  if (!center || center.r !== question.center.r || center.c !== question.center.c) return null;

  let best: Crystal[] | null = null;
  let bestCost = Infinity;

  function solve(
    index: number,
    chosen: Crystal[],
    seen: Set<CellIndex>,
    usedHCols: Set<number>,
    usedVRows: Set<number>,
    usedVCols: Set<number>,
    cost: number
  ): void {
    if (index === objects.length) {
      if (cost < bestCost) {
        bestCost = cost;
        best = chosen.map(crystal => ({ ...crystal }));
      }
      return;
    }

    const crystal = objects[index];
    const options: Array<[number, number]> = crystal.q === fixed
      ? [[crystal.r, crystal.c]]
      : crystal.o === 'h'
        ? unsafeCols
          .filter(c => !usedHCols.has(c))
          .flatMap(c => [0, 1, 2, 3].map(r => [r, c] as [number, number]))
        : unsafeRows
          .filter(r => !usedVRows.has(r))
          .flatMap(r => [0, 1, 2, 3]
            .filter(c => !usedVCols.has(c))
            .map(c => [r, c] as [number, number]));

    for (const [r, c] of options) {
      if (crystal.o === 'h' && (usedHCols.has(c) || !unsafeCols.includes(c))) continue;
      if (crystal.o === 'v' && (usedVRows.has(r) || usedVCols.has(c) || !unsafeRows.includes(r))) continue;
      if (seen.has(toCellIndex(r, c))) continue;

      const original = question.crystals.find(value => value.q === crystal.q);
      if (!original) continue;
      const edge = r === 0 || r === 3 || c === 0 || c === 3 ? 0 : 0.4;
      const penalty = Math.abs(r - original.r) + Math.abs(c - original.c) + edge;
      solve(
        index + 1,
        [...chosen, { ...crystal, r, c }],
        new Set([...seen, toCellIndex(r, c)]),
        new Set(crystal.o === 'h' ? [...usedHCols, c] : [...usedHCols]),
        new Set(crystal.o === 'v' ? [...usedVRows, r] : [...usedVRows]),
        new Set(crystal.o === 'v' ? [...usedVCols, c] : [...usedVCols]),
        cost + penalty
      );
    }
  }

  solve(0, [], new Set(), new Set(), new Set(), new Set(), 0);
  return best;
}

export type CrystalGeometryResult =
  | { ok: true; reason: '' }
  | { ok: false; reason: string };

export function validateCrystalGeometry(
  question: KetudukeQuestion,
  crystals: Crystal[]
): CrystalGeometryResult {
  if (crystals.length !== 4) return { ok: false, reason: '結算水晶數量不正確' };
  const spots = new Set(crystals.map(crystal => toCellIndex(crystal.r, crystal.c)));
  if (spots.size !== 4) return { ok: false, reason: '有水晶重疊，吹風位移模型不一致' };
  const vertical = crystals.filter(crystal => crystal.o === 'v');
  if (vertical.length !== 2 || new Set(vertical.map(crystal => crystal.c)).size !== 2) {
    return { ok: false, reason: '兩顆直水晶落在同一直行，位移模型不一致' };
  }
  const safe = referenceSafeZones(question.center);
  const hazards = hazardCells(crystals);
  if (safe.size !== 4 || [...safe].some(cell => hazards.has(cell)) || hazards.size !== 12) {
    return { ok: false, reason: '水晶結算位置與攻略四個安全格不相符' };
  }
  return { ok: true, reason: '' };
}

export function crystalMotionPlan(question: KetudukeQuestion): CrystalMotionPlan | null {
  const target = canonicalCrystalFinal(question);
  if (!target) return null;
  const taken = new Set<CellIndex>();
  const middle: Crystal[] = [];

  for (const crystal of question.crystals) {
    const end = target.find(value => value.q === crystal.q);
    if (!end) return null;
    const fixed = crystal.q === quadrantOf(question.center.r, question.center.c);
    const columns = fixed
      ? [crystal.c]
      : [
          end.c,
          crystal.c,
          ...[0, 1, 2, 3].sort((a, b) => Math.abs(a - end.c) - Math.abs(b - end.c))
        ];
    const c = columns.find(column => !taken.has(toCellIndex(crystal.r, column)));
    if (c === undefined) return null;
    taken.add(toCellIndex(crystal.r, c));
    middle.push({ ...crystal, c });
  }

  return { middle, target };
}
