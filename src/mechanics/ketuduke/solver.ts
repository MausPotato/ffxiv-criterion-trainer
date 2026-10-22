import { toCoordinate } from '../../domain/grid.ts';
import { ROLES, type Role } from '../../domain/roles.ts';
import type { CellIndex } from '../../domain/grid.ts';
import { autoQueue, candidatePrePositions, mahjongRegion, wantedMahjongRegion } from './queue.ts';
import { referenceSafeZones } from './safe-zones.ts';
import { projectedEnd } from './wind.ts';
import type {
  CompletePlayerPositions,
  KetudukeQuestion,
  PartySolution,
  PlayerPositions
} from './types.ts';

export function solveParty(
  question: KetudukeQuestion,
  focus: Role,
  playerSpot: CellIndex | null = null
): PartySolution | null {
  const cells = {} as Record<Role, CellIndex[]>;
  for (const role of ROLES) {
    cells[role] = candidatePrePositions(question, role);
    if (role === focus && playerSpot !== null) {
      cells[role] = cells[role].filter(cell => cell === playerSpot);
    }
    if (!cells[role].length) return null;
  }

  const safe = referenceSafeZones(question.center);
  let solution: PartySolution | null = null;

  function visit(index: number, chosen: PlayerPositions): void {
    if (solution) return;
    if (index === ROLES.length) {
      const pre = chosen as CompletePlayerPositions;
      const ends = Object.fromEntries(
        ROLES.map(role => [role, projectedEnd(question, role, pre[role])])
      ) as CompletePlayerPositions;
      if (!ROLES.every(role => safe.has(ends[role]))) return;
      if (question.party === '分散') {
        if (new Set(Object.values(ends)).size !== 4) return;
      } else if (ends.MT !== ends.D1 || ends.H !== ends.D2 || ends.MT === ends.H) {
        return;
      }
      solution = { pre: { ...pre }, final: ends };
      return;
    }

    const role = ROLES[index];
    for (const position of cells[role]) {
      visit(index + 1, { ...chosen, [role]: position });
    }
  }

  visit(0, {});
  return solution;
}

export type PrePositionError =
  | { error: string; type: 'player' }
  | { error: string; type: 'simulator' };

export function prePositionError(
  question: KetudukeQuestion,
  focus: Role,
  selected: CellIndex | undefined
): PrePositionError | null {
  if (selected === undefined) return { error: '請選自己的吹風前站位。', type: 'player' };
  const queue = autoQueue(question);
  const from = toCoordinate(queue[focus]);
  const destination = toCoordinate(selected);
  if (Math.abs(destination.r - from.r) + Math.abs(destination.c - from.c) !== 1) {
    return { error: '你要從自己的排隊格移動剛好一格。', type: 'player' };
  }
  if (question.center.o === 'h' && destination.r !== from.r) {
    return { error: '你應往左右移動一格。', type: 'player' };
  }
  if (question.center.o === 'v' && destination.c !== from.c) {
    return { error: '你應往上下移動一格。', type: 'player' };
  }
  if (mahjongRegion(question, destination.r, destination.c) !== wantedMahjongRegion(question, focus)) {
    return {
      error: `你的 Buff 與分攤／分散對應的是 ${wantedMahjongRegion(question, focus)} 麻區。`,
      type: 'player'
    };
  }
  if (!solveParty(question, focus, selected)) {
    return {
      error: '隊友模擬找不到合法的整隊站位；此題暫停結算，不將模擬問題算成你的死亡。',
      type: 'simulator'
    };
  }
  return null;
}

export type GroupCheckResult = { ok: boolean; detail: string };

export function groupCheck(
  question: KetudukeQuestion,
  positions: PlayerPositions
): GroupCheckResult {
  const groups = new Map<CellIndex, Role[]>();
  for (const role of ROLES) {
    const cell = positions[role];
    if (cell === undefined) return { ok: false, detail: '有角色沒有結算落點' };
    const members = groups.get(cell) ?? [];
    members.push(role);
    groups.set(cell, members);
  }
  if (question.party === '分散') {
    return groups.size === 4
      ? { ok: true, detail: '四人分別站在不同格' }
      : { ok: false, detail: '分散有角色重疊' };
  }
  const exact = positions.MT === positions.D1
    && positions.H === positions.D2
    && positions.MT !== positions.H;
  return exact
    ? { ok: true, detail: 'MT＋D1、H＋D2，各組兩人同格' }
    : { ok: false, detail: '分攤應為 MT＋D1、H＋D2 各兩人同格，隊友配置不正確' };
}
