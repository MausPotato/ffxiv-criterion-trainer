import { LALARU_FIELD_SIZE, LALARU_PLAYER_RADIUS } from './geometry.ts';
import type { ArenaPoint } from './types.ts';

export type CompositeOrientation = 'north-south' | 'east-west';
export type CompositeOrbOrder = 'upper-first' | 'lower-first';
export type CompositeRouteVariant = 'primary' | 'mirrored';
export type GridDirection = 'up' | 'right' | 'down' | 'left';
export type CompositeDamageKind = 'persistent-dot';

export interface GridCell {
  row: number;
  col: number;
}

export interface DirectionMarker {
  cell: GridCell;
  direction: GridDirection;
}

export interface CompositeOrb {
  id: 'orb-a' | 'orb-b';
  cell: GridCell;
}

export interface CompositePattern {
  orientation: CompositeOrientation;
  orbOrder: CompositeOrbOrder;
  routeVariant: CompositeRouteVariant;
  starts: readonly DirectionMarker[];
  turns: readonly DirectionMarker[];
  orbs: readonly CompositeOrb[];
  routes: readonly (readonly GridCell[])[];
  damageKind: CompositeDamageKind;
}

const BASE_STARTS: readonly DirectionMarker[] = [
  { cell: { row: 4, col: 0 }, direction: 'up' },
  { cell: { row: 0, col: 4 }, direction: 'down' }
];

const BASE_TURNS: readonly DirectionMarker[] = [
  { cell: { row: 0, col: 0 }, direction: 'right' },
  { cell: { row: 0, col: 1 }, direction: 'down' },
  { cell: { row: 4, col: 4 }, direction: 'left' },
  { cell: { row: 4, col: 3 }, direction: 'up' }
];

const BASE_ORBS: Readonly<Record<CompositeOrbOrder, readonly CompositeOrb[]>> = {
  'upper-first': [
    { id: 'orb-a', cell: { row: 1, col: 4 } },
    { id: 'orb-b', cell: { row: 4, col: 1 } }
  ],
  'lower-first': [
    { id: 'orb-a', cell: { row: 3, col: 0 } },
    { id: 'orb-b', cell: { row: 0, col: 3 } }
  ]
};

const ROUTE_LENGTH = 10;
const DIRECTION_DELTA: Readonly<Record<GridDirection, GridCell>> = {
  up: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 }
};

export function cellKey(cell: GridCell): string {
  return `${cell.row}:${cell.col}`;
}

export function gridCellCenter(cell: GridCell): ArenaPoint {
  return { x: cell.col + .5, y: cell.row + .5 };
}

export function sameCell(a: GridCell, b: GridCell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function traceCompositeRoute(
  start: DirectionMarker,
  turns: readonly DirectionMarker[],
  length = ROUTE_LENGTH
): readonly GridCell[] {
  const route: GridCell[] = [{ ...start.cell }];
  let direction = start.direction;

  while (route.length < length) {
    const current = route.at(-1)!;
    const turn = turns.find(marker => sameCell(marker.cell, current));
    if (turn) direction = turn.direction;
    const delta = DIRECTION_DELTA[direction];
    const next = { row: current.row + delta.row, col: current.col + delta.col };
    if (next.row < 0 || next.row >= LALARU_FIELD_SIZE || next.col < 0 || next.col >= LALARU_FIELD_SIZE) {
      throw new Error(`Composite route left the arena at ${cellKey(next)}`);
    }
    route.push(next);
  }

  return route;
}

export function rotateCellClockwise(cell: GridCell): GridCell {
  return { row: cell.col, col: LALARU_FIELD_SIZE - 1 - cell.row };
}

export function mirrorCellHorizontally(cell: GridCell): GridCell {
  return { row: cell.row, col: LALARU_FIELD_SIZE - 1 - cell.col };
}

export function mirrorDirectionHorizontally(direction: GridDirection): GridDirection {
  if (direction === 'left') return 'right';
  if (direction === 'right') return 'left';
  return direction;
}

export function rotateDirectionClockwise(direction: GridDirection): GridDirection {
  const directions: readonly GridDirection[] = ['up', 'right', 'down', 'left'];
  return directions[(directions.indexOf(direction) + 1) % directions.length]!;
}

function rotateMarker(marker: DirectionMarker): DirectionMarker {
  return {
    cell: rotateCellClockwise(marker.cell),
    direction: rotateDirectionClockwise(marker.direction)
  };
}

function mirrorMarker(marker: DirectionMarker): DirectionMarker {
  return {
    cell: mirrorCellHorizontally(marker.cell),
    direction: mirrorDirectionHorizontally(marker.direction)
  };
}

export function createCompositePattern(
  orientation: CompositeOrientation,
  orbOrder: CompositeOrbOrder = 'upper-first',
  routeVariant: CompositeRouteVariant = 'primary'
): CompositePattern {
  const rotate = orientation === 'east-west';
  const mirror = routeVariant === 'mirrored';
  const baseStarts = mirror ? BASE_STARTS.map(mirrorMarker) : BASE_STARTS;
  const baseTurns = mirror ? BASE_TURNS.map(mirrorMarker) : BASE_TURNS;
  const baseOrbs = mirror
    ? BASE_ORBS[orbOrder].map(orb => ({ ...orb, cell: mirrorCellHorizontally(orb.cell) }))
    : BASE_ORBS[orbOrder];
  const starts = rotate ? baseStarts.map(rotateMarker) : baseStarts.map(marker => ({ ...marker, cell: { ...marker.cell } }));
  const turns = rotate ? baseTurns.map(rotateMarker) : baseTurns.map(marker => ({ ...marker, cell: { ...marker.cell } }));
  const orbs = rotate
    ? baseOrbs.map(orb => ({ ...orb, cell: rotateCellClockwise(orb.cell) }))
    : baseOrbs.map(orb => ({ ...orb, cell: { ...orb.cell } }));

  return {
    orientation,
    orbOrder,
    routeVariant,
    starts,
    turns,
    orbs,
    routes: starts.map(start => traceCompositeRoute(start, turns)),
    damageKind: 'persistent-dot'
  };
}

export function cellsAtStep(pattern: CompositePattern, stepIndex: number): readonly GridCell[] {
  if (stepIndex < 0) return [];
  return pattern.routes.flatMap(route => route[stepIndex] ? [route[stepIndex]!] : []);
}

export function dangerousCellsThroughStep(pattern: CompositePattern, stepIndex: number): readonly GridCell[] {
  const unique = new Map<string, GridCell>();
  for (const route of pattern.routes) {
    for (const cell of route.slice(0, stepIndex + 1)) unique.set(cellKey(cell), cell);
  }
  return [...unique.values()];
}

export function finalSafeCells(pattern: CompositePattern): readonly GridCell[] {
  const dangerous = new Set(dangerousCellsThroughStep(pattern, ROUTE_LENGTH - 1).map(cellKey));
  const safe: GridCell[] = [];
  for (let row = 0; row < LALARU_FIELD_SIZE; row += 1) {
    for (let col = 0; col < LALARU_FIELD_SIZE; col += 1) {
      const cell = { row, col };
      if (!dangerous.has(cellKey(cell))) safe.push(cell);
    }
  }
  return safe;
}

export function isPointInDangerousCells(
  point: ArenaPoint,
  dangerousCells: readonly GridCell[],
  radius = LALARU_PLAYER_RADIUS
): boolean {
  return dangerousCells.some(cell => {
    const closestX = Math.max(cell.col, Math.min(point.x, cell.col + 1));
    const closestY = Math.max(cell.row, Math.min(point.y, cell.row + 1));
    return Math.hypot(point.x - closestX, point.y - closestY) <= radius;
  });
}

export const COMPOSITE_ROUTE_LENGTH = ROUTE_LENGTH;
