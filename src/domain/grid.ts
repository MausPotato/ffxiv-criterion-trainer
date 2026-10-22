export const GRID_SIZE = 4;

export type CellIndex = number;
export type Quadrant = 0 | 1 | 2 | 3;

export interface GridCoordinate {
  r: number;
  c: number;
}

export function toCellIndex(r: number, c: number): CellIndex {
  return r * GRID_SIZE + c;
}

export function toCoordinate(index: CellIndex): GridCoordinate {
  return { r: Math.floor(index / GRID_SIZE), c: index % GRID_SIZE };
}

export function clampGridCoordinate(value: number): number {
  return Math.max(0, Math.min(GRID_SIZE - 1, value));
}

export function quadrantOf(r: number, c: number): Quadrant {
  return ((r < 2 ? 0 : 2) + (c < 2 ? 0 : 1)) as Quadrant;
}

export function isInsideGrid(r: number, c: number): boolean {
  return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}
