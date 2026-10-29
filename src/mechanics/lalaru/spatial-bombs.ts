import { LALARU_FIELD_SIZE, LALARU_PLAYER_RADIUS } from './geometry.ts';
import { rotateCellClockwise, type GridCell } from './composite-pattern.ts';
import type { ArenaPoint, LalaRuQuestion } from './types.ts';

export type SpatialPartyId = 'you' | 'npc-a' | 'npc-b' | 'npc-c';
export type SubtractionLayer = 1 | 2 | 3 | 4;
export type QuarterTurn = 0 | 1 | 2 | 3;
export type SpatialRouteId = 'route-a' | 'route-b';
export type SpatialDamageKind = 'white-orb' | 'cross-bomb';

const SPATIAL_PARTY_DIAMOND_OFFSETS: Readonly<Record<SpatialPartyId, ArenaPoint>> = {
  you: { x: 0, y: -.24 },
  'npc-a': { x: .24, y: 0 },
  'npc-b': { x: 0, y: .24 },
  'npc-c': { x: -.24, y: 0 }
};

export interface SpatialRouteStep {
  step: number;
  cell: GridCell;
  event: 'none' | 'turn' | 'white-orb' | 'bomb';
}

export interface SpatialBomb {
  id: string;
  routeId: SpatialRouteId;
  step: number;
  cell: GridCell;
}

export interface SpatialDamageSource {
  id: string;
  kind: SpatialDamageKind;
  step: number;
  cell: GridCell | null;
}

export interface SpatialPartyMember {
  id: SpatialPartyId;
  initialLayer: SubtractionLayer;
}

export interface SpatialBombQuestion {
  rotation: QuarterTurn;
  party: readonly SpatialPartyMember[];
  cannon: LalaRuQuestion;
}

export interface SpatialBombPattern {
  rotation: QuarterTurn;
  starts: Readonly<Record<SpatialRouteId, GridCell>>;
  routes: Readonly<Record<SpatialRouteId, readonly SpatialRouteStep[]>>;
  whiteOrb: { id: 'white-orb'; routeId: 'route-a'; step: 1; cell: GridCell };
  bombs: readonly SpatialBomb[];
}

export const SPATIAL_PARTY_IDS: readonly SpatialPartyId[] = ['you', 'npc-a', 'npc-b', 'npc-c'];

const BASE_STARTS: Readonly<Record<SpatialRouteId, GridCell>> = {
  'route-a': { row: 0, col: 4 },
  'route-b': { row: 4, col: 0 }
};

const BASE_ROUTES: Readonly<Record<SpatialRouteId, readonly SpatialRouteStep[]>> = {
  'route-a': [
    { step: 1, cell: { row: 1, col: 4 }, event: 'white-orb' },
    { step: 2, cell: { row: 2, col: 4 }, event: 'none' },
    { step: 3, cell: { row: 3, col: 4 }, event: 'none' },
    { step: 4, cell: { row: 4, col: 4 }, event: 'turn' },
    { step: 5, cell: { row: 4, col: 3 }, event: 'turn' },
    { step: 6, cell: { row: 3, col: 3 }, event: 'bomb' },
    { step: 7, cell: { row: 2, col: 3 }, event: 'none' },
    { step: 8, cell: { row: 1, col: 3 }, event: 'none' },
    { step: 9, cell: { row: 0, col: 3 }, event: 'bomb' }
  ],
  'route-b': [
    { step: 1, cell: { row: 3, col: 0 }, event: 'bomb' },
    { step: 2, cell: { row: 2, col: 0 }, event: 'none' },
    { step: 3, cell: { row: 1, col: 0 }, event: 'bomb' },
    { step: 4, cell: { row: 0, col: 0 }, event: 'turn' },
    { step: 5, cell: { row: 0, col: 1 }, event: 'turn' },
    { step: 6, cell: { row: 1, col: 1 }, event: 'none' },
    { step: 7, cell: { row: 2, col: 1 }, event: 'bomb' },
    { step: 8, cell: { row: 3, col: 1 }, event: 'none' },
    { step: 9, cell: { row: 4, col: 1 }, event: 'bomb' }
  ]
};

function rotateCell(cell: GridCell, turns: QuarterTurn): GridCell {
  let result = { ...cell };
  for (let turn = 0; turn < turns; turn += 1) result = rotateCellClockwise(result);
  return result;
}

export function createSpatialBombPattern(rotation: QuarterTurn = 0): SpatialBombPattern {
  const routes = Object.fromEntries(
    (Object.entries(BASE_ROUTES) as [SpatialRouteId, readonly SpatialRouteStep[]][]).map(([id, steps]) => [
      id,
      steps.map(routeStep => ({ ...routeStep, cell: rotateCell(routeStep.cell, rotation) }))
    ])
  ) as unknown as Readonly<Record<SpatialRouteId, readonly SpatialRouteStep[]>>;
  const bombs = (Object.entries(routes) as [SpatialRouteId, readonly SpatialRouteStep[]][])
    .flatMap(([routeId, steps]) => steps
      .filter(routeStep => routeStep.event === 'bomb')
      .map(routeStep => ({
        id: `${routeId}-bomb-${routeStep.step}`,
        routeId,
        step: routeStep.step,
        cell: { ...routeStep.cell }
      })));
  return {
    rotation,
    starts: {
      'route-a': rotateCell(BASE_STARTS['route-a'], rotation),
      'route-b': rotateCell(BASE_STARTS['route-b'], rotation)
    },
    routes,
    whiteOrb: {
      id: 'white-orb',
      routeId: 'route-a',
      step: 1,
      cell: { ...routes['route-a'][0]!.cell }
    },
    bombs
  };
}

export function spatialCellsAtStep(pattern: SpatialBombPattern, step: number): readonly GridCell[] {
  if (step < 1 || step > 9) return [];
  return [pattern.routes['route-a'][step - 1]!.cell, pattern.routes['route-b'][step - 1]!.cell];
}

export function spatialDangerousCellsThroughStep(
  pattern: SpatialBombPattern,
  step: number
): readonly GridCell[] {
  const cells = new Map<string, GridCell>();
  for (const route of Object.values(pattern.routes)) {
    for (const routeStep of route.slice(0, Math.max(0, step))) {
      cells.set(`${routeStep.cell.row}:${routeStep.cell.col}`, routeStep.cell);
    }
  }
  return [...cells.values()];
}

/** Sources remain distinct so simultaneous hits are never collapsed into a boolean. */
export function spatialDamageSourcesAtStep(
  pattern: SpatialBombPattern,
  step: number
): readonly SpatialDamageSource[] {
  const sources: SpatialDamageSource[] = [];
  if (step === pattern.whiteOrb.step) {
    sources.push({ id: pattern.whiteOrb.id, kind: 'white-orb', step, cell: null });
  }
  for (const bomb of pattern.bombs.filter(candidate => candidate.step === step)) {
    sources.push({ id: bomb.id, kind: 'cross-bomb', step, cell: { ...bomb.cell } });
  }
  return sources;
}

export function pointIsInCellCross(point: ArenaPoint, cell: GridCell): boolean {
  const row = Math.min(LALARU_FIELD_SIZE - 1, Math.max(0, Math.floor(point.y)));
  const col = Math.min(LALARU_FIELD_SIZE - 1, Math.max(0, Math.floor(point.x)));
  return row === cell.row || col === cell.col;
}

export function spatialSourceHitsPoint(source: SpatialDamageSource, point: ArenaPoint): boolean {
  return source.kind === 'white-orb' || (source.cell !== null && pointIsInCellCross(point, source.cell));
}

function segmentIntersectsRect(
  start: ArenaPoint,
  end: ArenaPoint,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean {
  let enter = 0;
  let leave = 1;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  for (const [origin, delta, minimum, maximum] of [
    [start.x, dx, minX, maxX],
    [start.y, dy, minY, maxY]
  ] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    enter = Math.max(enter, Math.min(first, second));
    leave = Math.min(leave, Math.max(first, second));
    if (enter > leave) return false;
  }
  return true;
}

export function movementSegmentTouchesDanger(
  start: ArenaPoint,
  end: ArenaPoint,
  dangerousCells: readonly GridCell[],
  radius = LALARU_PLAYER_RADIUS
): boolean {
  return dangerousCells.some(cell => segmentIntersectsRect(
    start,
    end,
    cell.col - radius,
    cell.col + 1 + radius,
    cell.row - radius,
    cell.row + 1 + radius
  ));
}

export function shuffleSpatialLayers(random: () => number = Math.random): readonly SubtractionLayer[] {
  const layers: SubtractionLayer[] = [1, 2, 3, 4];
  for (let index = layers.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [layers[index], layers[target]] = [layers[target]!, layers[index]!];
  }
  return layers;
}

export function rotateSpatialPoint(point: ArenaPoint, turns: QuarterTurn): ArenaPoint {
  let result = { ...point };
  for (let turn = 0; turn < turns; turn += 1) {
    result = { x: LALARU_FIELD_SIZE - result.y, y: result.x };
  }
  return result;
}

export function spatialStandardPosition(layer: SubtractionLayer, rotation: QuarterTurn = 0): ArenaPoint {
  const base = layer <= 2 ? { x: 2.5, y: 2.5 } : { x: 2.5, y: 3.5 };
  return rotateSpatialPoint(base, rotation);
}

export function spatialInitialPartyPosition(id: SpatialPartyId): ArenaPoint {
  const offset = SPATIAL_PARTY_DIAMOND_OFFSETS[id];
  return {
    x: 2.5 + offset.x,
    y: 2.5 + offset.y
  };
}

export function offsetSpatialPartyPosition(
  id: SpatialPartyId,
  base: ArenaPoint,
  rotation: QuarterTurn = 0
): ArenaPoint {
  const offset = SPATIAL_PARTY_DIAMOND_OFFSETS[id];
  return rotateSpatialPoint({
    x: base.x + offset.x,
    y: base.y + offset.y
  }, rotation);
}

export function spatialStandardPartyPosition(
  id: SpatialPartyId,
  layer: SubtractionLayer,
  rotation: QuarterTurn = 0
): ArenaPoint {
  const base = layer <= 2 ? { x: 2.5, y: 2.5 } : { x: 2.5, y: 3.5 };
  return offsetSpatialPartyPosition(id, base, rotation);
}

export const SPATIAL_ROUTE_STEPS = 9;
