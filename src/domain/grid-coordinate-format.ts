import { toCoordinate, type CellIndex, type GridCoordinate } from './grid.ts';

export function formatGridCoordinate({ r, c }: GridCoordinate): string {
  return `第 ${c + 1} 直行、第 ${r + 1} 橫列`;
}

export function formatCellCoordinate(cell: CellIndex): string {
  return formatGridCoordinate(toCoordinate(cell));
}
