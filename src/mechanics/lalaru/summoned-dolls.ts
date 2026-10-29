import type { ArenaPoint, CardinalDirection } from './types.ts';

export const SUMMONED_DOLLS_GRID_SIZE = 5 as const;
export const SUMMONED_DOLLS_DEFAULT_DOLL_LANES = [1, 3, 4] as const;
export const SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS = [
  [0, 2, 4],
  [1, 3, 4]
] as const;
export const SUMMONED_DOLLS_PATTERN_DISPLAY_STEP_MS = 650;
export const SUMMONED_DOLLS_SHIFT_DISPLAY_MS = 700;
export const SUMMONED_DOLLS_MAGIC_BURST_DISPLAY_RADIUS = .72;
export const SUMMONED_DOLLS_MAGIC_BURST_MOVEMENT_MS = 700;
export const SUMMONED_DOLLS_ENUMERATION_DISPLAY_RADIUS = .45;

export type SummonedDollsFloorState =
  | 'normal'
  | 'aoe-telegraph'
  | 'pattern-step'
  | 'pattern-danger'
  | 'light-blast-lethal'
  | 'movement-safe';

export type SummonedDollsFloorEffectKind = Exclude<SummonedDollsFloorState, 'normal'>;
export type SummonedDollsFloorEffectSource = 'gale' | 'changing-pattern' | 'light-blast' | 'movement';
export type SummonedDollsPartyId = 'tank' | 'healer' | 'dps-melee' | 'dps-ranged';
export type SummonedDollsRole = 'tank' | 'healer' | 'dps';
export type SummonedDollsStatusId = 'even-explosion-target' | 'magic-vulnerability-up';
export type SummonedDollsShiftDirection = 'left' | 'right';
export type SummonedDollsShiftPhase =
  | 'locked-before-gale'
  | 'floor-resolved'
  | 'ready'
  | 'moving'
  | 'complete'
  | 'prepare-magic-burst';
export type SummonedDollsMagicBurstPhase =
  | 'inactive'
  | 'cast'
  | 'targets'
  | 'positioning'
  | 'snapshot'
  | 'first-impact'
  | 'vulnerability'
  | 'second-telegraph'
  | 'evacuation'
  | 'second-impact'
  | 'complete';
export type SummonedDollsMagicBurstCirclePhase = 'tracking' | 'snapshot' | 'first-impact'
  | 'second-telegraph' | 'second-impact';
export type SummonedDollsEnumerationPhase = 'inactive' | 'ready' | 'snapshot' | 'impact'
  | 'resolved' | 'finished';
export type SummonedDollsEnumerationTargetId = 'dps-melee' | 'dps-ranged';

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
  /** World-side spawn direction. Camera rotation is intentionally stored elsewhere. */
  dollSide: CardinalDirection;
  dollLanes: readonly number[];
  safeLanes: readonly number[];
  dolls: readonly SummonedDoll[];
}

export interface SummonedDollsFloorEffect {
  kind: SummonedDollsFloorEffectKind;
  source: SummonedDollsFloorEffectSource;
}

export interface SummonedDollsFloorCell extends SummonedDollsCell {
  /** Highest-priority presentation state. Mechanic logic should inspect effects instead. */
  state: SummonedDollsFloorState;
  effects: readonly SummonedDollsFloorEffect[];
}

export type SummonedDollsEventId =
  | 'even-explosion-status'
  | 'summon-dolls'
  | 'gale-telegraph'
  | 'changing-pattern-cast'
  | 'changing-pattern-starts'
  | 'changing-pattern-step'
  | 'changing-pattern-final'
  | 'light-blast-markers'
  | 'spread-for-light-blast'
  | 'light-blast-snapshot'
  | 'light-blast-impact'
  | 'gale-impact'
  | 'light-blast-floor'
  | 'magic-vulnerability'
  | 'prepare-shift'
  | 'shift-ready'
  | 'shift-to-former-aoe'
  | 'shift-complete'
  | 'prepare-magic-burst'
  | 'magic-burst-cast'
  | 'magic-burst-targets'
  | 'magic-burst-positioning'
  | 'magic-burst-snapshot'
  | 'magic-burst-first-impact'
  | 'magic-burst-vulnerability'
  | 'magic-burst-second-telegraph'
  | 'magic-burst-evacuation'
  | 'magic-burst-second-impact'
  | 'enumeration-stack-ready'
  | 'enumeration-stack-snapshot'
  | 'enumeration-stack-impact'
  | 'enumeration-stack-resolved'
  | 'mechanic-finished';

export interface SummonedDollsEventSpec {
  id: SummonedDollsEventId;
  label: string;
  description: string;
  implemented: boolean;
  timingConfirmed: boolean;
  kind: 'status' | 'spawn' | 'cast' | 'telegraph' | 'floor-update' | 'snapshot'
    | 'impact' | 'movement' | 'marker' | 'stack';
}

export interface SummonedDollsStatusSpec {
  id: SummonedDollsStatusId;
  label: string;
  targetIds: readonly SummonedDollsPartyId[];
  appliedAtEventId: SummonedDollsEventId;
  expiresAtEventId: SummonedDollsEventId | null;
  resolvesAtEventId: SummonedDollsEventId | null;
  /** Null means the game duration has not been confirmed and must not be fabricated. */
  durationMs: number | null;
  reappliedAtEventIds?: readonly SummonedDollsEventId[];
  resolutionPairs?: readonly {
    targetId: SummonedDollsPartyId;
    partnerId: SummonedDollsPartyId;
  }[];
}

export interface SummonedDollsPatternConfig {
  id: 'south-east-video-example';
  origin: 'south-east';
  confirmedDollSides: readonly ['north'];
  routeConfirmed: true;
  timingConfirmed: boolean;
  displayStepMs: number;
  paths: readonly SummonedDollsPatternPath[];
  startCells: readonly SummonedDollsCell[];
  stepSnapshots: readonly SummonedDollsPatternStepSnapshot[];
  finalCells: readonly SummonedDollsCell[];
}

export interface SummonedDollsPatternPath {
  id: 'upper' | 'lower';
  initialFacing: CardinalDirection;
  cells: readonly SummonedDollsCell[];
  turns: readonly {
    at: SummonedDollsCell;
    from: CardinalDirection;
    to: CardinalDirection;
  }[];
}

export interface SummonedDollsPatternStepSnapshot {
  index: number;
  activeCells: readonly SummonedDollsCell[];
  traversedCells: readonly SummonedDollsCell[];
}

export interface SummonedDollsFirstResolutionConfig {
  sources: readonly ['light-blast', 'gale'];
  relativeOrderConfirmed: boolean;
}

export interface SummonedDollsShiftCandidate {
  direction: SummonedDollsShiftDirection;
  position: ArenaPoint;
  cell: SummonedDollsCell;
}

export interface SummonedDollsShiftPlan {
  configurationKey: string;
  startPositions: Readonly<Record<SummonedDollsPartyId, ArenaPoint>>;
  candidates: Readonly<Record<SummonedDollsPartyId, readonly SummonedDollsShiftCandidate[]>>;
  targetPositions: Readonly<Partial<Record<SummonedDollsPartyId, ArenaPoint>>>;
  targetCells: Readonly<Partial<Record<SummonedDollsPartyId, SummonedDollsCell>>>;
  collisionFree: boolean;
}

export interface SummonedDollsMagicBurstConfig {
  /** Radius in arena world units. Display-only until verified against game footage. */
  displayRadius: number;
  radiusConfirmed: false;
  movementDisplayMs: number;
  placementPositions: Readonly<Record<SummonedDollsPartyId, ArenaPoint>>;
  enumerationPreparationPositions: Readonly<Record<SummonedDollsPartyId, ArenaPoint>>;
  enumerationGroups: readonly [
    readonly ['tank', 'dps-melee'],
    readonly ['healer', 'dps-ranged']
  ];
  enumerationDisplayRadius: number;
  enumerationRadiusConfirmed: false;
}

export interface SummonedDollsMagicBurstCircle {
  sourceId: SummonedDollsPartyId;
  position: ArenaPoint;
  radius: number;
  radiusConfirmed: false;
  phase: SummonedDollsMagicBurstCirclePhase;
}

export interface SummonedDollsMagicBurstSnapshot {
  capturedAtEventId: 'magic-burst-snapshot';
  positions: Readonly<Record<SummonedDollsPartyId, ArenaPoint>>;
  displayRadius: number;
  radiusConfirmed: false;
}

export interface SummonedDollsEnumerationSnapshot {
  capturedAtEventId: 'enumeration-stack-snapshot';
  positions: Readonly<Record<SummonedDollsPartyId, ArenaPoint>>;
}

export interface SummonedDollsEnumerationGroupResult {
  targetId: SummonedDollsEnumerationTargetId;
  center: ArenaPoint;
  expectedMemberIds: readonly SummonedDollsPartyId[];
  memberIds: readonly SummonedDollsPartyId[];
  count: number;
  expectedCount: 2;
  countStatus: 'correct' | 'under' | 'over';
  missingExpectedIds: readonly SummonedDollsPartyId[];
  unexpectedMemberIds: readonly SummonedDollsPartyId[];
  distances: Readonly<Record<SummonedDollsPartyId, number>>;
  passesDisplayCheck: boolean;
}

export interface SummonedDollsEnumerationResult {
  evaluatedAtEventId: 'enumeration-stack-impact';
  radius: number;
  radiusConfirmed: false;
  groups: Readonly<Record<SummonedDollsEnumerationTargetId, SummonedDollsEnumerationGroupResult>>;
  playersInBothGroups: readonly SummonedDollsPartyId[];
  allGroupsPassDisplayCheck: boolean;
}

export interface SummonedDollsEnumerationCircle {
  sourceId: SummonedDollsEnumerationTargetId;
  position: ArenaPoint;
  radius: number;
  radiusConfirmed: false;
  phase: 'ready' | 'snapshot' | 'impact';
}

export interface SummonedDollsScenario {
  id: string;
  configuration: SummonedDollsConfiguration;
  pattern: SummonedDollsPatternConfig;
  statuses: readonly SummonedDollsStatusSpec[];
  firstResolution: SummonedDollsFirstResolutionConfig;
  shiftDisplayMs: number;
  magicBurst: SummonedDollsMagicBurstConfig;
  spreadPositions: Readonly<Record<SummonedDollsPartyId, ArenaPoint>>;
  party: readonly SummonedDollsPartyMember[];
  events: readonly SummonedDollsEventSpec[];
  implementedEventIds: readonly SummonedDollsEventId[];
}

const displayEvent = (
  id: SummonedDollsEventId,
  label: string,
  description: string,
  kind: SummonedDollsEventSpec['kind']
): SummonedDollsEventSpec => ({ id, label, description, kind, implemented: true, timingConfirmed: false });

export const SUMMONED_DOLLS_EVENTS: readonly SummonedDollsEventSpec[] = [
  displayEvent('even-explosion-status', '雙數爆炸狀態', 'D1、D2 獲得爆炸目標；實際持續時間尚未確認。', 'status'),
  displayEvent('summon-dolls', '召喚人偶', '隨機一側依當次配置生成三隻阿羅阿羅樹木巨像。', 'spawn'),
  displayEvent('gale-telegraph', '烈風預警', '三隻小怪準備向當次配置的三列施放直線 AOE。', 'telegraph'),
  displayEvent('changing-pattern-cast', '變光魔紋詠唱', 'BOSS 開始詠唱變光魔紋；烈風預警保持獨立。', 'cast'),
  displayEvent('changing-pattern-starts', '生成步進起點', '右下範例於 (3,4)、(4,4) 生成兩個步進起點。', 'floor-update'),
  displayEvent('changing-pattern-step', '步進逐格推進', '依兩條獨立路徑逐步更新，已經過的格子保留危險狀態。', 'floor-update'),
  displayEvent('changing-pattern-final', '形成最終路徑', '兩條路徑完成後留下 5×4 外接矩形內的 12 格危險地板。', 'floor-update'),
  displayEvent('light-blast-markers', '四人光爆點名', '四名玩家獲得光爆點名，此時尚未生成即死格。', 'marker'),
  displayEvent('spread-for-light-blast', '光爆分散站位', '四人於可移動安全位置分散；判定位置尚未鎖定。', 'movement'),
  displayEvent('light-blast-snapshot', '記錄光爆判定位置', '在傷害判定瞬間記錄四名玩家所在格。', 'snapshot'),
  displayEvent('light-blast-impact', '光爆傷害判定', '使用判定瞬間的位置完成光爆判定；與烈風的相對時間待確認。', 'impact'),
  displayEvent('gale-impact', '烈風傷害判定', '三條烈風 AOE 完成判定；與光爆的相對時間待確認。', 'impact'),
  displayEvent('light-blast-floor', '生成光爆即死格', '將光爆判定瞬間的玩家所在格轉換為即死區。', 'floor-update'),
  displayEvent('magic-vulnerability', '魔法受傷加重', '光爆命中後，對四名玩家施加魔法受傷加重。', 'status'),
  displayEvent('prepare-shift', '烈風解除與即死格確定', '烈風 AOE 解除；保留魔紋與光爆即死格。', 'floor-update'),
  displayEvent('shift-ready', '同步平移就緒', '依當次小怪配置計算可橫移一格的候選位置。', 'movement'),
  displayEvent('shift-to-former-aoe', '同步平移', '四人依配置移入已解除的烈風範圍；不將整列直接視為安全。', 'movement'),
  displayEvent('shift-complete', '同步平移完成', '保存四名玩家各自的位置，供下一機制使用。', 'movement'),
  displayEvent('prepare-magic-burst', '準備魔爆法', '同步平移位置已鎖定，準備四人圓形 AOE。', 'floor-update'),
  displayEvent('magic-burst-cast', '魔爆法', 'BOSS 詠唱魔爆法；技能秒數尚待實機確認。', 'cast'),
  displayEvent('magic-burst-targets', '四人圓形點名', '四名玩家各自獲得一個跟隨本人的圓形 AOE。', 'marker'),
  displayEvent('magic-burst-positioning', '外側放置 AOE', '將四個圓形引導至各自安全格的外側角落。', 'movement'),
  displayEvent('magic-burst-snapshot', '記錄魔爆法位置', '以四名玩家的精確世界座標建立第一次判定快照。', 'snapshot'),
  displayEvent('magic-burst-first-impact', '魔爆法第一次判定', '四個圓形在快照座標完成第一次判定。', 'impact'),
  displayEvent('magic-burst-vulnerability', '魔法受傷加重', '第一次判定後，四名玩家的魔法受傷加重狀態重新套用。', 'status'),
  displayEvent('magic-burst-second-telegraph', '二段 AOE 預警', '四個二段圓形固定於第一次快照座標，不再跟隨玩家。', 'telegraph'),
  displayEvent('magic-burst-evacuation', '離開二段 AOE', '四人於二段預警期間開始移向兩組分攤準備位置。', 'movement'),
  displayEvent('enumeration-stack-ready', '雙數爆炸集合', '顯示 D1、D2 各自的展示分攤範圍；二段魔爆法仍未結算。', 'stack'),
  displayEvent('magic-burst-second-impact', '魔爆法第二次判定', '四個圓形在原快照座標再次發動。', 'impact'),
  displayEvent('enumeration-stack-snapshot', '記錄分攤位置', '以判定瞬間的四名玩家世界座標及 D1、D2 位置建立快照。', 'snapshot'),
  displayEvent('enumeration-stack-impact', '雙數爆炸判定', '依展示半徑分別檢查兩組人數及成員。', 'impact'),
  displayEvent('enumeration-stack-resolved', '雙數爆炸結算', '顯示兩組練習判定結果並清除分攤範圍與狀態。', 'stack'),
  displayEvent('mechanic-finished', '召喚人偶結束', '本輪展示完成；正式死亡與整體成功條件尚待補完。', 'floor-update')
] as const;

const IMPLEMENTED_EVENT_IDS = SUMMONED_DOLLS_EVENTS
  .filter(event => event.implemented)
  .map(event => event.id);

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

function createPatternFixture(): SummonedDollsPatternConfig {
  const upperPath: SummonedDollsPatternPath = {
    id: 'upper',
    initialFacing: 'north',
    cells: [
      { row: 3, col: 4 },
      { row: 2, col: 4 },
      { row: 1, col: 4 },
      { row: 1, col: 3 },
      { row: 1, col: 2 },
      { row: 1, col: 1 },
      { row: 1, col: 0 }
    ],
    turns: [{ at: { row: 1, col: 4 }, from: 'north', to: 'west' }]
  };
  const lowerPath: SummonedDollsPatternPath = {
    id: 'lower',
    initialFacing: 'west',
    cells: [
      { row: 4, col: 4 },
      { row: 4, col: 3 },
      { row: 4, col: 2 },
      { row: 4, col: 1 },
      { row: 4, col: 0 }
    ],
    turns: []
  };
  const paths = [upperPath, lowerPath] as const;
  const stepSnapshots = Array.from({ length: upperPath.cells.length }, (_, index) => {
    const activeCells = paths.flatMap(path => path.cells[index] ? [path.cells[index]!] : []);
    const traversedCells = paths.flatMap(path => path.cells.slice(0, index + 1));
    return { index, activeCells, traversedCells };
  });
  return {
    id: 'south-east-video-example',
    origin: 'south-east',
    confirmedDollSides: ['north'],
    routeConfirmed: true,
    timingConfirmed: false,
    displayStepMs: SUMMONED_DOLLS_PATTERN_DISPLAY_STEP_MS,
    paths,
    startCells: stepSnapshots[0]!.activeCells,
    stepSnapshots,
    finalCells: stepSnapshots.at(-1)!.traversedCells
  };
}

export function createSummonedDollsConfiguration(
  dollSide: CardinalDirection = 'north',
  dollLanes: readonly number[] = SUMMONED_DOLLS_DEFAULT_DOLL_LANES
): SummonedDollsConfiguration {
  const uniqueLanes = [...new Set(dollLanes)].sort((a, b) => a - b);
  if (uniqueLanes.length !== 3 || uniqueLanes.some(lane => lane < 0 || lane >= SUMMONED_DOLLS_GRID_SIZE)) {
    throw new Error('Summoned dolls require three unique lanes on the 5×5 grid.');
  }
  const safeLanes = Array.from({ length: SUMMONED_DOLLS_GRID_SIZE }, (_, lane) => lane)
    .filter(lane => !uniqueLanes.includes(lane));
  if (safeLanes.length !== 2) {
    throw new Error('Summoned dolls require exactly two empty lanes.');
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

const PARTY: readonly SummonedDollsPartyMember[] = [
  { id: 'tank', label: 'T', role: 'tank', hasStackBuff: false, position: { x: 1.45, y: 3.55 } },
  { id: 'healer', label: 'H', role: 'healer', hasStackBuff: false, position: { x: 3.55, y: 3.55 } },
  { id: 'dps-melee', label: 'D1', role: 'dps', hasStackBuff: true, position: { x: 1.45, y: 4.25 } },
  { id: 'dps-ranged', label: 'D2', role: 'dps', hasStackBuff: true, position: { x: 3.55, y: 4.25 } }
] as const;

function scenarioForSide(
  dollSide: CardinalDirection,
  dollLanes: readonly number[] = SUMMONED_DOLLS_DEFAULT_DOLL_LANES
): SummonedDollsScenario {
  const configuration = createSummonedDollsConfiguration(dollSide, dollLanes);
  const [leftSafeLane, rightSafeLane] = configuration.safeLanes;
  const spreadPositions: Record<SummonedDollsPartyId, ArenaPoint> = {
    tank: { x: leftSafeLane! + .38, y: 2.28 },
    'dps-melee': { x: leftSafeLane! + .62, y: 3.72 },
    healer: { x: rightSafeLane! + .38, y: 2.28 },
    'dps-ranged': { x: rightSafeLane! + .62, y: 3.72 }
  };
  const shiftDestinationLanes = configuration.dollLanes.join(',') === '0,2,4'
    ? [0, 2] as const
    : [1, 3] as const;
  const [leftShiftLane, rightShiftLane] = shiftDestinationLanes;
  const magicBurst: SummonedDollsMagicBurstConfig = {
    displayRadius: SUMMONED_DOLLS_MAGIC_BURST_DISPLAY_RADIUS,
    radiusConfirmed: false,
    movementDisplayMs: SUMMONED_DOLLS_MAGIC_BURST_MOVEMENT_MS,
    placementPositions: {
      tank: { x: Number((leftShiftLane + .16).toFixed(2)), y: 2.16 },
      'dps-melee': { x: Number((leftShiftLane + .16).toFixed(2)), y: 3.84 },
      healer: { x: Number((rightShiftLane + .84).toFixed(2)), y: 2.16 },
      'dps-ranged': { x: Number((rightShiftLane + .84).toFixed(2)), y: 3.84 }
    },
    enumerationPreparationPositions: {
      tank: { x: Number((leftShiftLane + .62).toFixed(2)), y: 2.9 },
      'dps-melee': { x: Number((leftShiftLane + .82).toFixed(2)), y: 3.1 },
      healer: { x: Number((rightShiftLane + .18).toFixed(2)), y: 2.9 },
      'dps-ranged': { x: Number((rightShiftLane + .38).toFixed(2)), y: 3.1 }
    },
    enumerationGroups: [['tank', 'dps-melee'], ['healer', 'dps-ranged']],
    enumerationDisplayRadius: SUMMONED_DOLLS_ENUMERATION_DISPLAY_RADIUS,
    enumerationRadiusConfirmed: false
  };
  return {
    id: `${dollSide}-${configuration.dollLanes.join('')}-display-fixture`,
    configuration,
    pattern: createPatternFixture(),
    statuses: [
      {
        id: 'even-explosion-target',
        label: '爆炸目標',
        targetIds: ['dps-melee', 'dps-ranged'],
        appliedAtEventId: 'even-explosion-status',
        expiresAtEventId: 'enumeration-stack-resolved',
        resolvesAtEventId: 'enumeration-stack-resolved',
        durationMs: null,
        resolutionPairs: [
          { targetId: 'dps-melee', partnerId: 'tank' },
          { targetId: 'dps-ranged', partnerId: 'healer' }
        ]
      },
      {
        id: 'magic-vulnerability-up',
        label: '魔法受傷加重',
        targetIds: PARTY.map(member => member.id),
        appliedAtEventId: 'magic-vulnerability',
        expiresAtEventId: null,
        resolvesAtEventId: null,
        durationMs: null,
        reappliedAtEventIds: ['magic-burst-vulnerability']
      }
    ],
    firstResolution: {
      sources: ['light-blast', 'gale'],
      relativeOrderConfirmed: false
    },
    shiftDisplayMs: SUMMONED_DOLLS_SHIFT_DISPLAY_MS,
    magicBurst,
    spreadPositions,
    party: PARTY,
    events: SUMMONED_DOLLS_EVENTS,
    implementedEventIds: IMPLEMENTED_EVENT_IDS
  };
}

export function createFixedSummonedDollsScenario(
  dollSide: CardinalDirection = 'north',
  dollLanes: readonly number[] = SUMMONED_DOLLS_DEFAULT_DOLL_LANES
): SummonedDollsScenario {
  return scenarioForSide(dollSide, dollLanes);
}

export function createSummonedDollsScenario(random: () => number = Math.random): SummonedDollsScenario {
  const patternIndex = Math.min(
    SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS.length - 1,
    Math.max(0, Math.floor(random() * SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS.length))
  );
  return scenarioForSide(
    'north',
    SUMMONED_DOLLS_CONFIRMED_LANE_PATTERNS[patternIndex]!
  );
}

function cellKey(cell: SummonedDollsCell): string {
  return `${cell.row}-${cell.col}`;
}

const SHIFT_DIRECTIONS_BY_CONFIGURATION: Readonly<Record<
  string,
  Readonly<Record<SummonedDollsPartyId, SummonedDollsShiftDirection>>
>> = {
  '0,2,4': { tank: 'left', healer: 'left', 'dps-melee': 'left', 'dps-ranged': 'left' },
  '1,3,4': { tank: 'right', healer: 'right', 'dps-melee': 'right', 'dps-ranged': 'right' }
};

function cellFromPoint(point: ArenaPoint): SummonedDollsCell {
  return {
    row: Math.max(0, Math.min(SUMMONED_DOLLS_GRID_SIZE - 1, Math.floor(point.y))),
    col: Math.max(0, Math.min(SUMMONED_DOLLS_GRID_SIZE - 1, Math.floor(point.x)))
  };
}

export function createSummonedDollsShiftPlan(
  scenario: SummonedDollsScenario,
  startPositions: Readonly<Record<SummonedDollsPartyId, ArenaPoint>>,
  floorCells: readonly SummonedDollsFloorCell[]
): SummonedDollsShiftPlan {
  const configurationKey = scenario.configuration.dollLanes.join(',');
  const configuredDirections = SHIFT_DIRECTIONS_BY_CONFIGURATION[configurationKey];
  if (!configuredDirections) throw new Error(`No confirmed shift plan for doll lanes ${configurationKey}.`);
  const formerGaleKeys = new Set(scenario.configuration.dolls
    .flatMap(doll => doll.attackCells)
    .map(cellKey));
  const hazardousKeys = new Set(floorCells
    .filter(cell => cell.effects.some(effect => [
      'aoe-telegraph', 'pattern-step', 'pattern-danger', 'light-blast-lethal'
    ].includes(effect.kind)))
    .map(cellKey));

  const candidateEntries = scenario.party.map(member => {
    const start = startPositions[member.id];
    const options = ([['left', -1], ['right', 1]] as const).flatMap(([direction, delta]) => {
      const position = { x: Number((start.x + delta).toFixed(6)), y: start.y };
      if (position.x < 0 || position.x >= SUMMONED_DOLLS_GRID_SIZE) return [];
      const cell = cellFromPoint(position);
      const key = cellKey(cell);
      if (!formerGaleKeys.has(key) || hazardousKeys.has(key)) return [];
      return [{ direction, position, cell } satisfies SummonedDollsShiftCandidate];
    });
    return [member.id, options] as const;
  });
  const candidates: Record<SummonedDollsPartyId, readonly SummonedDollsShiftCandidate[]> = {
    tank: [],
    healer: [],
    'dps-melee': [],
    'dps-ranged': [],
    ...Object.fromEntries(candidateEntries)
  };

  const targetPositions: Partial<Record<SummonedDollsPartyId, ArenaPoint>> = {};
  const targetCells: Partial<Record<SummonedDollsPartyId, SummonedDollsCell>> = {};
  for (const member of scenario.party) {
    const selected = candidates[member.id]
      .find(candidate => candidate.direction === configuredDirections[member.id]);
    if (!selected) continue;
    targetPositions[member.id] = { ...selected.position };
    targetCells[member.id] = { ...selected.cell };
  }
  const targetKeys = Object.values(targetCells).map(cellKey);
  return {
    configurationKey,
    startPositions: Object.fromEntries(Object.entries(startPositions)
      .map(([id, point]) => [id, { ...point }])) as Record<SummonedDollsPartyId, ArenaPoint>,
    candidates,
    targetPositions,
    targetCells,
    collisionFree: targetKeys.length === scenario.party.length
      && new Set(targetKeys).size === targetKeys.length
  };
}

export function evaluateSummonedDollsEnumeration(
  scenario: SummonedDollsScenario,
  positions: Readonly<Record<SummonedDollsPartyId, ArenaPoint>>
): SummonedDollsEnumerationResult {
  const radius = scenario.magicBurst.enumerationDisplayRadius;
  const results = scenario.magicBurst.enumerationGroups.map(expectedMemberIds => {
    const targetId = expectedMemberIds.find(id =>
      scenario.party.find(member => member.id === id)?.hasStackBuff
    ) as SummonedDollsEnumerationTargetId;
    const center = positions[targetId];
    const distances = Object.fromEntries(scenario.party.map(member => [
      member.id,
      Math.hypot(
        positions[member.id].x - center.x,
        positions[member.id].y - center.y
      )
    ])) as Record<SummonedDollsPartyId, number>;
    const memberIds = scenario.party
      .filter(member => distances[member.id] <= radius)
      .map(member => member.id);
    const expectedMemberSet = new Set<SummonedDollsPartyId>(expectedMemberIds);
    const missingExpectedIds = expectedMemberIds.filter(id => !memberIds.includes(id));
    const unexpectedMemberIds = memberIds.filter(id => !expectedMemberSet.has(id));
    const countStatus: SummonedDollsEnumerationGroupResult['countStatus'] = memberIds.length < 2
      ? 'under'
      : memberIds.length > 2 ? 'over' : 'correct';
    return {
      targetId,
      center: { ...center },
      expectedMemberIds: [...expectedMemberIds],
      memberIds,
      count: memberIds.length,
      expectedCount: 2 as const,
      countStatus,
      missingExpectedIds,
      unexpectedMemberIds,
      distances,
      passesDisplayCheck: false
    };
  });
  const memberships = new Map<SummonedDollsPartyId, number>();
  for (const result of results) {
    for (const id of result.memberIds) memberships.set(id, (memberships.get(id) ?? 0) + 1);
  }
  const playersInBothGroups = scenario.party
    .map(member => member.id)
    .filter(id => (memberships.get(id) ?? 0) > 1);
  for (const result of results) {
    result.passesDisplayCheck = result.countStatus === 'correct'
      && result.missingExpectedIds.length === 0
      && result.unexpectedMemberIds.length === 0
      && !result.memberIds.some(id => playersInBothGroups.includes(id));
  }
  const groups: Record<SummonedDollsEnumerationTargetId, SummonedDollsEnumerationGroupResult> = {
    'dps-melee': results.find(result => result.targetId === 'dps-melee')!,
    'dps-ranged': results.find(result => result.targetId === 'dps-ranged')!
  };
  return {
    evaluatedAtEventId: 'enumeration-stack-impact',
    radius,
    radiusConfirmed: false,
    groups,
    playersInBothGroups,
    allGroupsPassDisplayCheck: results.every(result => result.passesDisplayCheck)
  };
}

function eventIndex(eventId: SummonedDollsEventId | null, scenario: SummonedDollsScenario): number {
  return eventId === null ? -1 : scenario.implementedEventIds.indexOf(eventId);
}

function catalogEventIndex(eventId: SummonedDollsEventId | null, scenario: SummonedDollsScenario): number {
  return eventId === null ? -1 : scenario.events.findIndex(event => event.id === eventId);
}

function eventReached(
  currentEventId: SummonedDollsEventId | null,
  targetEventId: SummonedDollsEventId,
  scenario: SummonedDollsScenario
): boolean {
  const targetIndex = scenario.implementedEventIds.indexOf(targetEventId);
  return targetIndex >= 0 && eventIndex(currentEventId, scenario) >= targetIndex;
}

export function lightBlastCellsFromSnapshot(
  snapshot: Readonly<Partial<Record<SummonedDollsPartyId, ArenaPoint>>> | null
): readonly SummonedDollsCell[] {
  if (!snapshot) return [];
  const cells = Object.values(snapshot).map(point => ({
    row: Math.max(0, Math.min(SUMMONED_DOLLS_GRID_SIZE - 1, Math.floor(point.y))),
    col: Math.max(0, Math.min(SUMMONED_DOLLS_GRID_SIZE - 1, Math.floor(point.x)))
  }));
  return [...new Map(cells.map(cell => [cellKey(cell), cell])).values()];
}

export function summonedDollsStatusStateAtEvent(
  status: SummonedDollsStatusSpec,
  eventId: SummonedDollsEventId | null,
  scenario: SummonedDollsScenario = createFixedSummonedDollsScenario()
): 'pending' | 'active' | 'expired' | 'resolved' {
  const currentIndex = catalogEventIndex(eventId, scenario);
  if (currentIndex < catalogEventIndex(status.appliedAtEventId, scenario)) return 'pending';
  if (status.resolvesAtEventId
    && currentIndex >= catalogEventIndex(status.resolvesAtEventId, scenario)) return 'resolved';
  if (status.expiresAtEventId
    && currentIndex >= catalogEventIndex(status.expiresAtEventId, scenario)) return 'expired';
  return 'active';
}

const STATE_PRIORITY: readonly SummonedDollsFloorState[] = [
  'light-blast-lethal',
  'pattern-step',
  'pattern-danger',
  'aoe-telegraph',
  'movement-safe',
  'normal'
];

export function summonedDollsFloorAtEvent(
  eventId: SummonedDollsEventId | null,
  scenario: SummonedDollsScenario = createFixedSummonedDollsScenario(),
  lightBlastSnapshot: Readonly<Partial<Record<SummonedDollsPartyId, ArenaPoint>>> | null = null,
  patternStepIndex = 0,
  movementCandidates: readonly ArenaPoint[] = []
): readonly SummonedDollsFloorCell[] {
  const effects = new Map<string, SummonedDollsFloorEffect[]>();
  const addEffect = (
    cells: readonly SummonedDollsCell[],
    effect: SummonedDollsFloorEffect
  ): void => {
    for (const cell of cells) {
      const key = cellKey(cell);
      const existing = effects.get(key) ?? [];
      if (!existing.some(item => item.kind === effect.kind && item.source === effect.source)) {
        effects.set(key, [...existing, effect]);
      }
    }
  };

  const galeStarted = eventReached(eventId, 'gale-telegraph', scenario);
  const galeResolved = eventReached(eventId, 'gale-impact', scenario);
  if (galeStarted && (!galeResolved || eventId === 'gale-impact')) {
    addEffect(
      scenario.configuration.dolls.flatMap(doll => doll.attackCells),
      { kind: 'aoe-telegraph', source: 'gale' }
    );
  }

  if (eventReached(eventId, 'changing-pattern-starts', scenario)
    && !eventReached(eventId, 'changing-pattern-final', scenario)) {
    const snapshotIndex = eventId === 'changing-pattern-step'
      ? Math.max(1, Math.min(patternStepIndex, scenario.pattern.stepSnapshots.length - 1))
      : 0;
    const snapshot = scenario.pattern.stepSnapshots[snapshotIndex]!;
    const activeKeys = new Set(snapshot.activeCells.map(cellKey));
    addEffect(
      snapshot.traversedCells.filter(cell => !activeKeys.has(cellKey(cell))),
      { kind: 'pattern-danger', source: 'changing-pattern' }
    );
    addEffect(snapshot.activeCells, { kind: 'pattern-step', source: 'changing-pattern' });
  }

  if (eventReached(eventId, 'changing-pattern-final', scenario)) {
    addEffect(scenario.pattern.finalCells, { kind: 'pattern-danger', source: 'changing-pattern' });
  }

  if (eventReached(eventId, 'light-blast-floor', scenario)) {
    addEffect(lightBlastCellsFromSnapshot(lightBlastSnapshot), {
      kind: 'light-blast-lethal',
      source: 'light-blast'
    });
  }

  const allCells = Array.from({ length: SUMMONED_DOLLS_GRID_SIZE ** 2 }, (_, index) => ({
    row: Math.floor(index / SUMMONED_DOLLS_GRID_SIZE),
    col: index % SUMMONED_DOLLS_GRID_SIZE
  }));
  const shiftPrepared = eventReached(eventId, 'prepare-shift', scenario);
  if (galeStarted && !shiftPrepared) {
    const hazardKinds: readonly SummonedDollsFloorEffectKind[] = [
      'aoe-telegraph', 'pattern-step', 'pattern-danger', 'light-blast-lethal'
    ];
    const safeCells = allCells.filter(cell =>
      !(effects.get(cellKey(cell)) ?? []).some(effect => hazardKinds.includes(effect.kind)));
    addEffect(safeCells, { kind: 'movement-safe', source: 'movement' });
  }
  if (shiftPrepared && movementCandidates.length > 0) {
    addEffect(movementCandidates.map(cellFromPoint), {
      kind: 'movement-safe', source: 'movement'
    });
  }

  return allCells.map(cell => {
    const cellEffects = effects.get(cellKey(cell)) ?? [];
    const state = STATE_PRIORITY.find(candidate =>
      candidate === 'normal' || cellEffects.some(effect => effect.kind === candidate)) ?? 'normal';
    return { ...cell, state, effects: cellEffects };
  });
}
