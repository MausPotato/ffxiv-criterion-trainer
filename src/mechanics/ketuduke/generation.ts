import { quadrantOf } from '../../domain/grid.ts';
import type { RoleMap } from '../../domain/roles.ts';
import type {
  Buff,
  Crystal,
  CrystalOrientation,
  KetudukeQuestion
} from './types.ts';

export type RandomSource = () => number;

function randomInteger(limit: number, random: RandomSource): number {
  return Math.floor(random() * limit);
}

function opposite(orientation: CrystalOrientation): CrystalOrientation {
  return orientation === 'h' ? 'v' : 'h';
}

export function generateQuestion(random: RandomSource = Math.random): KetudukeQuestion {
  const cr = 1 + randomInteger(2, random);
  const cc = 1 + randomInteger(2, random);
  const o: CrystalOrientation = randomInteger(2, random) ? 'h' : 'v';
  const cq = quadrantOf(cr, cc);
  const crystals: Crystal[] = [];

  for (let q = 0; q < 4; q++) {
    const qrow = q < 2 ? 0 : 2;
    const qcol = q % 2 ? 2 : 0;
    const samePattern = (Math.floor(q / 2) + q % 2) % 2
      === (Math.floor(cq / 2) + cq % 2) % 2;
    const orientation = samePattern ? o : opposite(o);
    const options: Array<[number, number]> = [];

    for (let r = qrow; r < qrow + 2; r++) {
      for (let c = qcol; c < qcol + 2; c++) {
        if ((r === cr && c === cc) || !(r >= 1 && r <= 2 && c >= 1 && c <= 2)) {
          options.push([r, c]);
        }
      }
    }

    const [r, c] = q === cq
      ? [cr, cc]
      : options[randomInteger(options.length, random)];
    crystals.push({ r, c, o: orientation, q: q as Crystal['q'] });
  }

  const bubbleTH = randomInteger(2, random) === 0;
  const buffs: RoleMap<Buff> = {
    MT: bubbleTH ? 'bubble' : 'bind',
    H: bubbleTH ? 'bubble' : 'bind',
    D1: bubbleTH ? 'bind' : 'bubble',
    D2: bubbleTH ? 'bind' : 'bubble'
  };
  const rotation = ((cq === 0 || cq === 3) === (o === 'h')) ? 'cw' : 'ccw';

  return {
    center: { r: cr, c: cc, o },
    crystals,
    buffs,
    party: randomInteger(2, random) ? '分攤' : '分散',
    rotation
  };
}
