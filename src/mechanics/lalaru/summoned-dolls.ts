import type { ArenaPoint, CardinalDirection } from './types.ts';

export const SUMMONED_DOLLS_GRID_SIZE = 5 as const;

export type SummonedDollsFloorState =
  | 'normal'
  | 'danger'
  | 'temporary-safe'
  | 'telegraph'
  | 'resolved';

export type SummonedDollsPartyId = 'tank' | 'healer' | 'dps-melee' | 'dps-ranged';
export type SummonedDollsRole = 'tank' | 'healer' | 'dps';

export interface SummonedDollsCell {
  row: number;
  col: number;
}

export interface SummonedDoll {
  id: string;
  /** Lane in mechanic-local space, where the doll side is always local north. */
  localLane: number;
  worldLane: number;
  position: ArenaPoint;
  attackCells: readonly SummonedDollsCell[];
}

export interface SummonedDollsPartyMember {
  id: SummonedDollsPartyId;
  label: string;
  role: SummonedDollsRole;
  hasStackBuff: boolean;
  position: ArenaPoint;
}

export interface SummonedDollsConfiguration {
  dollSide: CardinalDirection;
  dollLanes: readonly number[];
  safeLanes: readonly number[];
  dolls: readonly SummonedDoll[];
}

export interface SummonedDollsFloorCell extends SummonedDollsCell {
  state: SummonedDollsFloorState;
}

export type SummonedDollsEventId =
  | 'summon-dolls'
  | 'line-aoe'
  | 'changing-pattern-warning'
  | 'changing-pattern-step'
  | 'first-changing-explosion'
  | 'shift-to-former-aoe'
  | 'magic-burst-cast'
  | 'spread-markers'
  | 'second-aoe-placement'
  | 'return-to-center'
  | 'dps-stacks';

export interface SummonedDollsEventSpec {
  id: SummonedDollsEventId;
  label: string;
  description: string;
  implemented: boolean;
  kind: 'spawn' | 'telegraph' | 'floor-update' | 'impact' | 'movement' | 'marker' | 'stack';
}

export interface SummonedDollsScenario {
  id: string;
  configuration: SummonedDollsConfiguration;
  party: readonly SummonedDollsPartyMember[];
  events: readonly SummonedDollsEventSpec[];
  implementedEventIds: readonly SummonedDollsEventId[];
}

export const SUMMONED_DOLLS_EVENTS: readonly SummonedDollsEventSpec[] = [
  { id: 'summon-dolls', label: '召喚人偶', description: '北側生成三隻人偶；兩名 DPS 顯示分攤 BUFF。', implemented: true, kind: 'spawn' },
  { id: 'line-aoe', label: '小怪直線 AOE', description: '顯示三條與格線對齊的攻擊列，以及兩條保留列。', implemented: true, kind: 'telegraph' },
  { id: 'changing-pattern-warning', label: '變光魔紋', description: '以資料快照顯示第一組 AOE 預警。', implemented: true, kind: 'floor-update' },
  { id: 'changing-pattern-step', label: '變光魔紋步進', description: '前一區完成判定，下一組區域進入預警。', implemented: true, kind: 'floor-update' },
  { id: 'first-changing-explosion', label: '第一次變光爆炸', description: '完成第一段展示，保留各格判定狀態。', implemented: true, kind: 'impact' },
  { id: 'shift-to-former-aoe', label: '同步平移', description: '全隊移入原小怪攻擊列；格位讓位規則待確認。', implemented: false, kind: 'movement' },
  { id: 'magic-burst-cast', label: '魔爆法', description: '後半段詠唱事件規格。', implemented: false, kind: 'telegraph' },
  { id: 'spread-markers', label: '分散圓形 AOE', description: '四人獲得分散點名；範圍與時間待確認。', implemented: false, kind: 'marker' },
  { id: 'second-aoe-placement', label: '外側放置二段 AOE', description: '在外側角落放置後續 AOE。', implemented: false, kind: 'movement' },
  { id: 'return-to-center', label: '返回中央安全區', description: '分散判定後集合到保留的中央區域。', implemented: false, kind: 'movement' },
  { id: 'dps-stacks', label: 'DPS 分攤', description: 'T＋近戰、H＋遠程兩組分攤。', implemented: false, kind: 'stack' }
] as const;

const IMPLEMENTED_EVENT_IDS = SUMMONED_DOLLS_EVENTS
  .filter(event => event.implemented)
  .map(event => event.id);

/**
 * Display-only path fixture used to exercise the floor-state model. It is
 * intentionally isolated from collision/damage rules until the real route is confirmed.
 */
export const SUMMONED_DOLLS_DEMO_PATH = {
  first: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
  second: [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 3, col: 3 }]
} as const satisfies Readonly<Record<string, readonly SummonedDollsCell[]>>;

function directionTurns(direction: CardinalDirection): number {
  return ({ north: 0, east: 1, south: 2, west: 3 } as const)[direction];
}

export function rotateSummonedDollsCell(
  cell: SummonedDollsCell,
  direction: CardinalDirection
): SummonedDollsCell {
  let rotated = { ...cell };
  for (let turn = 0; turn < directionTurns(direction); turn += 1) {
    rotated = { row: rotated.col, col: SUMMONED_DOLLS_GRID_SIZE - 1 - rotated.row };
  }
  return rotated;
}

export function rotateSummonedDollsPoint(point: ArenaPoint, direction: CardinalDirection): ArenaPoint {
  let rotated = { ...point };
  for (let turn = 0; turn < directionTurns(direction); turn += 1) {
    rotated = { x: SUMMONED_DOLLS_GRID_SIZE - rotated.y, y: rotated.x };
  }
  return rotated;
}

export function createSummonedDollsConfiguration(
  dollSide: CardinalDirection = 'north',
  dollLanes: readonly number[] = [0, 2, 4]
): SummonedDollsConfiguration {
  const uniqueLanes = [...new Set(dollLanes)].sort((a, b) => a - b);
  if (uniqueLanes.length !== 3 || uniqueLanes.some(lane => lane < 0 || lane >= SUMMONED_DOLLS_GRID_SIZE)) {
    throw new Error('Summoned dolls require three unique lanes on the 5×5 grid.');
  }
  const safeLanes = Array.from({ length: SUMMONED_DOLLS_GRID_SIZE }, (_, lane) => lane)
    .filter(lane => !uniqueLanes.includes(lane));
  if (safeLanes.length !== 2 || safeLanes[1]! - safeLanes[0]! !== 2) {
    throw new Error('The two empty doll lanes must have exactly one lane between them.');
  }

  const dolls = uniqueLanes.map((localLane, index) => {
    const attackCells = Array.from({ length: SUMMONED_DOLLS_GRID_SIZE }, (_, row) =>
      rotateSummonedDollsCell({ row, col: localLane }, dollSide));
    const position = rotateSummonedDollsPoint({ x: localLane + .5, y: -.28 }, dollSide);
    const worldLane = dollSide === 'north' || dollSide === 'south'
      ? attackCells[0]!.col
      : attackCells[0]!.row;
    return { id: `doll-${index + 1}`, localLane, worldLane, position, attackCells };
  });

  return { dollSide, dollLanes: uniqueLanes, safeLanes, dolls };
}

export function createFixedSummonedDollsScenario(): SummonedDollsScenario {
  return {
    id: 'north-demo',
    configuration: createSummonedDollsConfiguration('north'),
    party: [
      { id: 'tank', label: 'T', role: 'tank', hasStackBuff: false, position: { x: 1.45, y: 3.55 } },
      { id: 'healer', label: 'H', role: 'healer', hasStackBuff: false, position: { x: 3.55, y: 3.55 } },
      { id: 'dps-melee', label: 'D1', role: 'dps', hasStackBuff: true, position: { x: 1.45, y: 4.25 } },
      { id: 'dps-ranged', label: 'D2', role: 'dps', hasStackBuff: true, position: { x: 3.55, y: 4.25 } }
    ],
    events: SUMMONED_DOLLS_EVENTS,
    implementedEventIds: IMPLEMENTED_EVENT_IDS
  };
}

function cellKey(cell: SummonedDollsCell): string {
  return `${cell.row}-${cell.col}`;
}

export function summonedDollsFloorAtEvent(
  eventId: SummonedDollsEventId | null,
  scenario: SummonedDollsScenario = createFixedSummonedDollsScenario()
): readonly SummonedDollsFloorCell[] {
  const states = new Map<string, SummonedDollsFloorState>();
  const setCells = (cells: readonly SummonedDollsCell[], state: SummonedDollsFloorState) => {
    for (const cell of cells) states.set(cellKey(cell), state);
  };

  if (eventId === 'line-aoe' || eventId === 'changing-pattern-warning' || eventId === 'changing-pattern-step') {
    setCells(scenario.configuration.dolls.flatMap(doll => doll.attackCells), 'danger');
    const safeCells = scenario.configuration.safeLanes.flatMap(col =>
      Array.from({ length: SUMMONED_DOLLS_GRID_SIZE }, (_, row) =>
        rotateSummonedDollsCell({ row, col }, scenario.configuration.dollSide)));
    setCells(safeCells, 'temporary-safe');
  }
  const firstPath = SUMMONED_DOLLS_DEMO_PATH.first.map(cell =>
    rotateSummonedDollsCell(cell, scenario.configuration.dollSide));
  const secondPath = SUMMONED_DOLLS_DEMO_PATH.second.map(cell =>
    rotateSummonedDollsCell(cell, scenario.configuration.dollSide));
  if (eventId === 'changing-pattern-warning') setCells(firstPath, 'telegraph');
  if (eventId === 'changing-pattern-step') {
    setCells(firstPath, 'resolved');
    setCells(secondPath, 'telegraph');
  }
  if (eventId === 'first-changing-explosion') {
    setCells(firstPath, 'resolved');
    setCells(secondPath, 'resolved');
  }

  return Array.from({ length: SUMMONED_DOLLS_GRID_SIZE ** 2 }, (_, index) => {
    const cell = { row: Math.floor(index / SUMMONED_DOLLS_GRID_SIZE), col: index % SUMMONED_DOLLS_GRID_SIZE };
    return { ...cell, state: states.get(cellKey(cell)) ?? 'normal' };
  });
}
