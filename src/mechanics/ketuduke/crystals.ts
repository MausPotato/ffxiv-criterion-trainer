import { GRID_SIZE, toCellIndex } from '../../domain/grid.ts';
import type { CellIndex } from '../../domain/grid.ts';
import { referenceSafeZones } from './safe-zones.ts';
import { simulateCrystalWindStep } from './wind.ts';
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
  const plan = crystalMotionPlan(question);
  if (!plan || !validateCrystalGeometry(question, plan.target).ok) return null;
  return plan.target.map(crystal => ({ ...crystal }));
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
  if (question.crystals.length !== 4 || new Set(question.crystals.map(crystal => crystal.q)).size !== 4) {
    return null;
  }
  const middle = simulateCrystalWindStep(question, question.crystals, 1);
  const target = simulateCrystalWindStep(question, middle, 2);
  return { middle, target };
}
