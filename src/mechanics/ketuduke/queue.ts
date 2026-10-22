import { GRID_SIZE, isInsideGrid, toCellIndex, toCoordinate } from '../../domain/grid.ts';
import { type Role, type RoleMap } from '../../domain/roles.ts';
import type { CellIndex } from '../../domain/grid.ts';
import { formatCellCoordinate } from '../../domain/grid-coordinate-format.ts';
import type { KetudukeQuestion, MahjongRegion } from './types.ts';

export function queueLine(question: KetudukeQuestion): CellIndex[] {
  const { r, c, o } = question.center;
  return Array.from(
    { length: GRID_SIZE },
    (_, index) => o === 'h' ? toCellIndex(index, c) : toCellIndex(r, index)
  );
}

export function mahjongRegion(question: KetudukeQuestion, r: number, c: number): MahjongRegion {
  const quadrant = (r < 2 ? 0 : 2) + (c < 2 ? 0 : 1);
  return question.crystals[quadrant].o === 'h' ? 1 : 2;
}

export function wantedMahjongRegion(question: KetudukeQuestion, role: Role): MahjongRegion {
  return question.buffs[role] === 'bubble' || question.party === '分攤' ? 1 : 2;
}

export function autoQueue(question: KetudukeQuestion): RoleMap<CellIndex> {
  const cells = queueLine(question);
  const output = {} as RoleMap<CellIndex>;
  const teams: Array<[number, Role[]]> = [
    [0, ['MT', 'D2']],
    [1, ['H', 'D1']]
  ];

  for (const [team, roles] of teams) {
    const outer = roles.find(role => question.buffs[role] === 'bind');
    const inner = roles.find(role => question.buffs[role] === 'bubble');
    if (outer) output[outer] = cells[team === 0 ? 0 : 3];
    if (inner) output[inner] = cells[team === 0 ? 1 : 2];
  }

  return output;
}

export function candidatePrePositions(question: KetudukeQuestion, role: Role): CellIndex[] {
  const queued = autoQueue(question);
  const { r, c } = toCoordinate(queued[role]);
  const possibilities: Array<[number, number]> = question.center.o === 'h'
    ? [[r, c - 1], [r, c + 1]]
    : [[r - 1, c], [r + 1, c]];

  return possibilities
    .filter(([nextR, nextC]) =>
      isInsideGrid(nextR, nextC)
      && mahjongRegion(question, nextR, nextC) === wantedMahjongRegion(question, role)
    )
    .map(([nextR, nextC]) => toCellIndex(nextR, nextC));
}

export function queueError(question: KetudukeQuestion, role: Role, selected?: CellIndex): string | null {
  if (selected === undefined) return '請選自己的排隊位置。';
  const ideal = autoQueue(question)[role];
  if (selected === ideal) return null;
  return `你的排隊位置不符：${role} 應站${formatCellCoordinate(ideal)}。`;
}
