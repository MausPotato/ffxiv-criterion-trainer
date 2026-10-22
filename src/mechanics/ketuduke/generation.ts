import { quadrantOf } from '../../domain/grid.ts';
import type { RoleMap } from '../../domain/roles.ts';
import { crystalMotionPlan, validateCrystalGeometry } from './crystals.ts';
import type {
  Buff,
  CenterCrystal,
  Crystal,
  CrystalOrientation,
  KetudukeQuestion,
  Rotation
} from './types.ts';

export type RandomSource = () => number;

function randomInteger(limit: number, random: RandomSource): number {
  return Math.floor(random() * limit);
}

function opposite(orientation: CrystalOrientation): CrystalOrientation {
  return orientation === 'h' ? 'v' : 'h';
}

function rotationFor(center: CenterCrystal): Rotation {
  const centerQuadrant = quadrantOf(center.r, center.c);
  return ((centerQuadrant === 0 || centerQuadrant === 3) === (center.o === 'h'))
    ? 'cw'
    : 'ccw';
}

function crystalOptions(center: CenterCrystal): Crystal[][] {
  const centerQuadrant = quadrantOf(center.r, center.c);
  return Array.from({ length: 4 }, (_, q) => {
    const qrow = q < 2 ? 0 : 2;
    const qcol = q % 2 ? 2 : 0;
    const samePattern = (Math.floor(q / 2) + q % 2) % 2
      === (Math.floor(centerQuadrant / 2) + centerQuadrant % 2) % 2;
    const orientation = samePattern ? center.o : opposite(center.o);

    if (q === centerQuadrant) {
      return [{ r: center.r, c: center.c, o: orientation, q: q as Crystal['q'] }];
    }

    const options: Crystal[] = [];
    for (let r = qrow; r < qrow + 2; r++) {
      for (let c = qcol; c < qcol + 2; c++) {
        if (!(r >= 1 && r <= 2 && c >= 1 && c <= 2)) {
          options.push({ r, c, o: orientation, q: q as Crystal['q'] });
        }
      }
    }
    return options;
  });
}

const legalLayoutCache = new Map<string, Crystal[][]>();

function cachedLegalInitialCrystalLayouts(center: CenterCrystal): Crystal[][] {
  const key = `${center.r},${center.c},${center.o}`;
  const cached = legalLayoutCache.get(key);
  if (cached) return cached;

  const options = crystalOptions(center);
  const rotation = rotationFor(center);
  const layouts: Crystal[][] = [];

  function visit(q: number, crystals: Crystal[]): void {
    if (q === options.length) {
      const question = {
        center,
        crystals,
        buffs: { MT: 'bubble', H: 'bubble', D1: 'bind', D2: 'bind' },
        party: '分散',
        rotation
      } satisfies KetudukeQuestion;
      const plan = crystalMotionPlan(question);
      const middleSpots = plan
        ? new Set(plan.middle.map(crystal => `${crystal.r},${crystal.c}`)).size
        : 0;
      if (plan && middleSpots === 4 && validateCrystalGeometry(question, plan.target).ok) {
        layouts.push(crystals.map(crystal => ({ ...crystal })));
      }
      return;
    }

    for (const crystal of options[q]) visit(q + 1, [...crystals, crystal]);
  }

  visit(0, []);
  legalLayoutCache.set(key, layouts);
  return layouts;
}

export function legalInitialCrystalLayouts(center: CenterCrystal): Crystal[][] {
  return cachedLegalInitialCrystalLayouts(center)
    .map(layout => layout.map(crystal => ({ ...crystal })));
}

export function generateQuestion(random: RandomSource = Math.random): KetudukeQuestion {
  const cr = 1 + randomInteger(2, random);
  const cc = 1 + randomInteger(2, random);
  const o: CrystalOrientation = randomInteger(2, random) ? 'h' : 'v';
  const center = { r: cr, c: cc, o };
  const cq = quadrantOf(cr, cc);
  let candidates = cachedLegalInitialCrystalLayouts(center);
  if (candidates.length === 0) {
    throw new Error(`No legal crystal layout for center (${cr}, ${cc}, ${o})`);
  }
  const crystals: Crystal[] = Array(4);

  for (let q = 0; q < 4; q++) {
    if (q === cq) {
      crystals[q] = { ...candidates[0][q] };
      continue;
    }
    const choices = candidates
      .map(layout => layout[q])
      .filter((crystal, index, values) =>
        values.findIndex(value => value.r === crystal.r && value.c === crystal.c) === index
      );
    const selected = choices[randomInteger(choices.length, random)];
    crystals[q] = { ...selected };
    candidates = candidates.filter(layout =>
      layout[q].r === selected.r && layout[q].c === selected.c
    );
  }

  const bubbleTH = randomInteger(2, random) === 0;
  const buffs: RoleMap<Buff> = {
    MT: bubbleTH ? 'bubble' : 'bind',
    H: bubbleTH ? 'bubble' : 'bind',
    D1: bubbleTH ? 'bind' : 'bubble',
    D2: bubbleTH ? 'bind' : 'bubble'
  };
  const rotation = rotationFor(center);

  return {
    center,
    crystals,
    buffs,
    party: randomInteger(2, random) ? '分攤' : '分散',
    rotation
  };
}
