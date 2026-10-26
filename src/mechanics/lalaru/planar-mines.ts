import type { ArenaPoint, ArrowSide, Multiplier } from './types.ts';

export type PlanarMineGap = 'north-west' | 'north-east' | 'south-east' | 'south-west';
export type PlanarStrategy = 'gap-bottom-left' | 'gap-bottom-right';
export type PlanarLayer = 1 | 2 | 3;
export type PlanarPartyId = 'you' | 'npc-a' | 'npc-b' | 'npc-c';
export type PlanarSlot = 'two-upper' | 'two-middle' | 'one-side' | 'three-bottom';
export type PlanarPhase = 'idle' | 'preparing' | 'forced-movement' | 'stack-resolving' | 'resolved' | 'dead';
export type PlanarMineRevealState = 'hidden' | 'telegraph' | 'full';

export interface PlanarMineCell {
  row: number;
  col: number;
}

export interface PlanarPartyMember {
  id: PlanarPartyId;
  layer: PlanarLayer;
  multiplier: Multiplier;
  arrowSide: ArrowSide;
  movement: 'forward';
  movementDurationSeconds: 16;
  explosionTarget: boolean;
  /** Randomized tie breaker used only when both 2-layer players share target status. */
  twoSlotOrder: number;
}

export interface PlanarMinesQuestion {
  gap: PlanarMineGap;
  party: readonly PlanarPartyMember[];
}

export interface PlanarAssignedPosition {
  member: PlanarPartyMember;
  slot: PlanarSlot;
  worldPosition: ArenaPoint;
  referencePosition: ArenaPoint;
}

export const PLANAR_PARTY_IDS: readonly PlanarPartyId[] = ['you', 'npc-a', 'npc-b', 'npc-c'];
export const PLANAR_GAPS: readonly PlanarMineGap[] = [
  'north-west',
  'north-east',
  'south-east',
  'south-west'
];

const GAP_CELL: Readonly<Record<PlanarMineGap, PlanarMineCell>> = {
  'north-west': { row: 1, col: 1 },
  'north-east': { row: 1, col: 3 },
  'south-east': { row: 3, col: 3 },
  'south-west': { row: 3, col: 1 }
};

/**
 * Provisional offsets around the central 3x3 mine field. Keep these together so
 * footage measurements can replace them without changing assignment logic.
 */
export const PLANAR_POSITION_OFFSETS = {
  sideDistance: 1.75,
  /** The 2 paired with the 3 waits slightly farther outside the mine field. */
  threePairTwoRetreatDistance: 0.18,
  /**
   * The lower 2 and the 1 straddle their shared grid line instead of standing
   * at cell centers, keeping both actors inside the roughly one-tile stack.
   */
  sideRows: [-1, 0.25, 0.75] as const,
  bottomDistance: 1.75,
  /** Layer 3 stands below the outer occupied mine column, not the center column. */
  threeBottomLateralDistance: 1
} as const;

/** Approximate video-derived events, kept together for later frame-level tuning. */
export const PLANAR_TIMELINE = {
  durationMs: 16_000,
  durationSeconds: 16,
  mineTelegraphRemainingMs: 15_000,
  mineFullRemainingMs: 14_000,
  rotationCueRemainingMs: 10_000,
  // The game clock shows about 4s when the five-dot presentation begins.
  rotationCountdownStartRemainingMs: 4_800,
  rotationCountdownDots: 5,
  rotationCountdownDotStepMs: 960,
  countdownDisplayStepMs: 1_000
} as const;

const ARENA_CENTER: Readonly<ArenaPoint> = { x: 2.5, y: 2.5 };

function sameCell(a: PlanarMineCell, b: PlanarMineCell): boolean {
  return a.row === b.row && a.col === b.col;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function planarMineCells(gap: PlanarMineGap): readonly PlanarMineCell[] {
  const missing = GAP_CELL[gap];
  const cells: PlanarMineCell[] = [];
  for (let row = 1; row <= 3; row += 1) {
    for (let col = 1; col <= 3; col += 1) {
      const cell = { row, col };
      if (!sameCell(cell, missing)) cells.push(cell);
    }
  }
  return cells;
}

export function planarGapCell(gap: PlanarMineGap): PlanarMineCell {
  return { ...GAP_CELL[gap] };
}

export function generatePlanarMinesQuestion(random: () => number = Math.random): PlanarMinesQuestion {
  const gap = pick(PLANAR_GAPS, random);
  const layers = shuffle<PlanarLayer>([1, 2, 2, 3], random);
  const explosionTargets = new Set(shuffle(PLANAR_PARTY_IDS, random).slice(0, 2));
  return {
    gap,
    party: PLANAR_PARTY_IDS.map((id, index) => ({
      id,
      layer: layers[index]!,
      multiplier: random() < .5 ? 'III' : 'V',
      movement: 'forward',
      movementDurationSeconds: PLANAR_TIMELINE.durationSeconds,
      explosionTarget: explosionTargets.has(id),
      arrowSide: random() < .5 ? 'left' : 'right',
      twoSlotOrder: random()
    }))
  };
}

export function targetGapForStrategy(strategy: PlanarStrategy): PlanarMineGap {
  return strategy === 'gap-bottom-left' ? 'south-west' : 'south-east';
}

/** Positive quarter turns match the existing camera's clockwise visual rotation. */
export function strategyCameraRotationDegrees(
  actualGap: PlanarMineGap,
  strategy: PlanarStrategy
): number {
  const targetGap = targetGapForStrategy(strategy);
  const actualIndex = PLANAR_GAPS.indexOf(actualGap);
  const targetIndex = PLANAR_GAPS.indexOf(targetGap);
  const clockwiseSteps = (targetIndex - actualIndex + 4) % 4;
  const degrees = clockwiseSteps * 90;
  return degrees > 180 ? degrees - 360 : degrees;
}

export function rotatePlanarPoint(point: ArenaPoint, degrees: number): ArenaPoint {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const dx = point.x - ARENA_CENTER.x;
  const dy = point.y - ARENA_CENTER.y;
  const clean = (value: number) => Math.abs(value) < 1e-10 ? 0 : value;
  return {
    x: clean(ARENA_CENTER.x + dx * cosine - dy * sine),
    y: clean(ARENA_CENTER.y + dx * sine + dy * cosine)
  };
}

export function planarReferencePositions(
  strategy: PlanarStrategy
): Readonly<Record<PlanarSlot, ArenaPoint>> {
  const sideSign = strategy === 'gap-bottom-left' ? -1 : 1;
  const sideX = ARENA_CENTER.x + sideSign * PLANAR_POSITION_OFFSETS.sideDistance;
  const retreatedSideX = ARENA_CENTER.x + sideSign * (
    PLANAR_POSITION_OFFSETS.sideDistance
      + PLANAR_POSITION_OFFSETS.threePairTwoRetreatDistance
  );
  const threeBottomX = ARENA_CENTER.x
    - sideSign * PLANAR_POSITION_OFFSETS.threeBottomLateralDistance;
  return {
    'two-upper': { x: retreatedSideX, y: ARENA_CENTER.y + PLANAR_POSITION_OFFSETS.sideRows[0] },
    'two-middle': { x: sideX, y: ARENA_CENTER.y + PLANAR_POSITION_OFFSETS.sideRows[1] },
    'one-side': { x: sideX, y: ARENA_CENTER.y + PLANAR_POSITION_OFFSETS.sideRows[2] },
    'three-bottom': { x: threeBottomX, y: ARENA_CENTER.y + PLANAR_POSITION_OFFSETS.bottomDistance }
  };
}

export function assignPlanarSlots(
  party: readonly PlanarPartyMember[]
): ReadonlyMap<PlanarPartyId, PlanarSlot> {
  const slots = new Map<PlanarPartyId, PlanarSlot>();
  const one = party.find(member => member.layer === 1);
  const three = party.find(member => member.layer === 3);
  const twos = party.filter(member => member.layer === 2);
  if (!one || !three || twos.length !== 2) throw new Error('Planar mine layers must be 1, 2, 2, 3.');
  // Put the 2 that balances the 1's stack-target state next to it. This keeps
  // the 1+2 pair from receiving either zero or two simultaneous stack markers.
  const orderedTwos = [...twos].sort((a, b) =>
    Number(a.explosionTarget === one.explosionTarget)
      - Number(b.explosionTarget === one.explosionTarget)
      || a.twoSlotOrder - b.twoSlotOrder);
  slots.set(one.id, 'one-side');
  slots.set(three.id, 'three-bottom');
  slots.set(orderedTwos[0]!.id, 'two-middle');
  slots.set(orderedTwos[1]!.id, 'two-upper');
  return slots;
}

export function planarAssignedPositions(
  question: PlanarMinesQuestion,
  strategy: PlanarStrategy
): readonly PlanarAssignedPosition[] {
  const slots = assignPlanarSlots(question.party);
  const references = planarReferencePositions(strategy);
  const cameraRotation = strategyCameraRotationDegrees(question.gap, strategy);
  return question.party.map(member => {
    const slot = slots.get(member.id)!;
    const referencePosition = references[slot];
    return {
      member,
      slot,
      referencePosition: { ...referencePosition },
      // Inverse of the camera alignment: world stays fixed while the player rotates the view.
      worldPosition: rotatePlanarPoint(referencePosition, -cameraRotation)
    };
  });
}
