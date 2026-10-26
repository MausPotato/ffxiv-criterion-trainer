import { clampLalaRuPlayerPosition } from './geometry.ts';
import {
  planarAssignedPositions,
  planarMineCells,
  strategyCameraRotationDegrees,
  type PlanarAssignedPosition,
  type PlanarMinesQuestion,
  type PlanarPartyId,
  type PlanarStrategy
} from './planar-mines.ts';
import type { ArenaPoint } from './types.ts';

export const PLANAR_RESOLUTION_TIMING = {
  /** Approximate: footage description suggests roughly two seconds per tile. */
  forcedMoveDurationMs: 6_000,
  forcedMoveDistance: 3,
  animationFrameMs: 50,
  mineExplosionDurationMs: 420,
  /** Double Impact begins as the forced movement reaches its endpoint. */
  doubleImpactAtMs: 6_000,
  doubleImpactDurationMs: 650
} as const;

export const PLANAR_RESOLUTION_GEOMETRY = {
  /** A mine is armed by entering any part of its one-tile floor cell. */
  mineTriggerHalfExtent: 0.5,
  mineAoeRadius: 0.4,
  /** 1.2-tile diameter, matching the current strategy reference. */
  stackAoeRadius: 0.6,
  expectedStartTolerance: 0.4,
  expectedFacingToleranceDegrees: 25
} as const;

export type PlanarFailureCode =
  | 'wrong-direction'
  | 'wrong-start'
  | 'remaining-layers'
  | 'mines-remaining'
  | 'mine-overhit'
  | 'stack-solo'
  | 'stack-double-hit';

export interface PlanarResolutionActorInput {
  id: PlanarPartyId;
  position: ArenaPoint;
  facingAngle: number;
  layer: 1 | 2 | 3;
  explosionTarget: boolean;
}

export interface PlanarActorPath {
  id: PlanarPartyId;
  start: ArenaPoint;
  end: ArenaPoint;
  facingAngle: number;
}

export interface PlanarMineTriggerEvent {
  mineKey: string;
  cell: { row: number; col: number };
  progress: number;
  atMs: number;
  triggeredBy: PlanarPartyId;
  affectedActorIds: readonly PlanarPartyId[];
  remainingLayersAfter: Readonly<Record<PlanarPartyId, number>>;
}

export interface PlanarStackCheck {
  targetId: PlanarPartyId;
  participantIds: readonly PlanarPartyId[];
  success: boolean;
}

export interface PlanarActorResolution {
  id: PlanarPartyId;
  initialLayer: number;
  triggeredMineCount: number;
  remainingLayer: number;
  finalPosition: ArenaPoint;
}

export interface PlanarResolutionResult {
  paths: readonly PlanarActorPath[];
  mineEvents: readonly PlanarMineTriggerEvent[];
  actorResults: readonly PlanarActorResolution[];
  stackChecks: readonly PlanarStackCheck[];
  triggeredMineKeys: readonly string[];
  allMinesTriggered: boolean;
  stackSucceeded: boolean;
  doubleHitActorIds: readonly PlanarPartyId[];
  success: boolean;
  failureCode: PlanarFailureCode | null;
  failureReason: string;
  failureAtMs: number | null;
}

export function planarMineKey(cell: { row: number; col: number }): string {
  return `${cell.row}-${cell.col}`;
}

function distance(a: ArenaPoint, b: ArenaPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizeAngle(angle: number): number {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

export function planarAngularDistance(a: number, b: number): number {
  return Math.abs(normalizeAngle(a - b));
}

function pointOnPath(path: PlanarActorPath, progress: number): ArenaPoint {
  return {
    x: path.start.x + (path.end.x - path.start.x) * progress,
    y: path.start.y + (path.end.y - path.start.y) * progress
  };
}

export function planarPathPoint(path: PlanarActorPath, progress: number): ArenaPoint {
  return pointOnPath(path, Math.max(0, Math.min(1, progress)));
}

/**
 * Returns when a movement segment first enters a mine's full square floor cell.
 * A tiny inset prevents a path that merely rides a shared grid line from
 * triggering both neighbouring cells.
 */
export function firstSegmentMineCellIntersection(
  start: ArenaPoint,
  end: ArenaPoint,
  center: ArenaPoint,
  halfExtent = PLANAR_RESOLUTION_GEOMETRY.mineTriggerHalfExtent
): number | null {
  const inset = 1e-7;
  const minX = center.x - halfExtent + inset;
  const maxX = center.x + halfExtent - inset;
  const minY = center.y - halfExtent + inset;
  const maxY = center.y + halfExtent - inset;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let entry = 0;
  let exit = 1;

  for (const [origin, delta, minimum, maximum] of [
    [start.x, dx, minX, maxX],
    [start.y, dy, minY, maxY]
  ] as const) {
    if (Math.abs(delta) < 1e-10) {
      if (origin < minimum || origin > maximum) return null;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) return null;
  }

  return entry >= 0 && entry <= 1 ? entry : null;
}

function desiredReferenceFacing(assignment: PlanarAssignedPosition, strategy: PlanarStrategy): number {
  if (assignment.slot === 'three-bottom') return 0;
  return strategy === 'gap-bottom-left' ? 90 : -90;
}

/** Final world-facing that sends the assigned actor through the intended mine line. */
export function planarExpectedFinalFacing(
  assignment: PlanarAssignedPosition,
  question: PlanarMinesQuestion,
  strategy: PlanarStrategy
): number {
  return normalizeAngle(
    desiredReferenceFacing(assignment, strategy)
      - strategyCameraRotationDegrees(question.gap, strategy)
  );
}

export function planarExpectedInitialFacing(
  assignment: PlanarAssignedPosition,
  question: PlanarMinesQuestion,
  strategy: PlanarStrategy,
  rotationOffset: number
): number {
  return normalizeAngle(planarExpectedFinalFacing(assignment, question, strategy) - rotationOffset);
}

export function planarForcedMovePath(actor: PlanarResolutionActorInput): PlanarActorPath {
  const radians = actor.facingAngle * Math.PI / 180;
  const rawEnd = {
    x: actor.position.x + Math.sin(radians) * PLANAR_RESOLUTION_TIMING.forcedMoveDistance,
    y: actor.position.y - Math.cos(radians) * PLANAR_RESOLUTION_TIMING.forcedMoveDistance
  };
  return {
    id: actor.id,
    start: { ...actor.position },
    end: clampLalaRuPlayerPosition(rawEnd),
    facingAngle: actor.facingAngle
  };
}

export function simulatePlanarMinesResolution(
  question: PlanarMinesQuestion,
  strategy: PlanarStrategy,
  actors: readonly PlanarResolutionActorInput[]
): PlanarResolutionResult {
  const paths = actors.map(planarForcedMovePath);
  const pathById = new Map(paths.map(path => [path.id, path]));
  const remaining = Object.fromEntries(actors.map(actor => [actor.id, actor.layer])) as Record<PlanarPartyId, number>;
  const hitCounts = Object.fromEntries(actors.map(actor => [actor.id, 0])) as Record<PlanarPartyId, number>;
  const mineEvents: PlanarMineTriggerEvent[] = [];
  const overhitIds = new Set<PlanarPartyId>();
  let firstOverhitAtMs: number | null = null;

  const candidates = planarMineCells(question.gap).flatMap(cell => {
    const center = { x: cell.col + 0.5, y: cell.row + 0.5 };
    let best: { progress: number; triggeredBy: PlanarPartyId } | null = null;
    for (const path of paths) {
      const progress = firstSegmentMineCellIntersection(
        path.start,
        path.end,
        center
      );
      if (progress !== null && (!best || progress < best.progress)) {
        best = { progress, triggeredBy: path.id };
      }
    }
    return best ? [{ cell, center, ...best }] : [];
  }).sort((a, b) => a.progress - b.progress || planarMineKey(a.cell).localeCompare(planarMineKey(b.cell)));

  for (const candidate of candidates) {
    const affectedActorIds = actors
      .filter(actor => distance(pointOnPath(pathById.get(actor.id)!, candidate.progress), candidate.center)
        <= PLANAR_RESOLUTION_GEOMETRY.mineAoeRadius + 1e-7 || actor.id === candidate.triggeredBy)
      .map(actor => actor.id);
    for (const id of affectedActorIds) {
      if (remaining[id] > 0) {
        remaining[id] -= 1;
        hitCounts[id] += 1;
      } else {
        overhitIds.add(id);
        firstOverhitAtMs ??= candidate.progress * PLANAR_RESOLUTION_TIMING.forcedMoveDurationMs;
      }
    }
    mineEvents.push({
      mineKey: planarMineKey(candidate.cell),
      cell: { ...candidate.cell },
      progress: candidate.progress,
      atMs: candidate.progress * PLANAR_RESOLUTION_TIMING.forcedMoveDurationMs,
      triggeredBy: candidate.triggeredBy,
      affectedActorIds,
      remainingLayersAfter: { ...remaining }
    });
    if (firstOverhitAtMs !== null) break;
  }

  const finalProgress = firstOverhitAtMs === null
    ? 1
    : firstOverhitAtMs / PLANAR_RESOLUTION_TIMING.forcedMoveDurationMs;
  const finalPositions = new Map(paths.map(path => [path.id, pointOnPath(path, finalProgress)]));
  const stackChecks = actors.filter(actor => actor.explosionTarget).map(actor => {
    const center = finalPositions.get(actor.id)!;
    const participantIds = actors
      .filter(candidate => distance(finalPositions.get(candidate.id)!, center)
        <= PLANAR_RESOLUTION_GEOMETRY.stackAoeRadius + 1e-7)
      .map(candidate => candidate.id);
    return {
      targetId: actor.id,
      participantIds,
      success: participantIds.length === 2
    };
  });
  const stackHitCounts = new Map<PlanarPartyId, number>();
  for (const check of stackChecks) {
    for (const id of check.participantIds) stackHitCounts.set(id, (stackHitCounts.get(id) ?? 0) + 1);
  }
  const doubleHitActorIds = actors
    .filter(actor => (stackHitCounts.get(actor.id) ?? 0) > 1)
    .map(actor => actor.id);
  const actorResults = actors.map(actor => ({
    id: actor.id,
    initialLayer: actor.layer,
    triggeredMineCount: hitCounts[actor.id],
    remainingLayer: remaining[actor.id],
    finalPosition: { ...finalPositions.get(actor.id)! }
  }));
  const allMinesTriggered = mineEvents.length === planarMineCells(question.gap).length;
  const stackSucceeded = stackChecks.every(check => check.success) && doubleHitActorIds.length === 0;
  const player = actors.find(actor => actor.id === 'you')!;
  const playerAssignment = planarAssignedPositions(question, strategy).find(item => item.member.id === 'you')!;
  const playerExpectedFacing = planarExpectedFinalFacing(playerAssignment, question, strategy);
  const playerWrongFacing = planarAngularDistance(player.facingAngle, playerExpectedFacing)
    > PLANAR_RESOLUTION_GEOMETRY.expectedFacingToleranceDegrees;
  const playerWrongStart = distance(player.position, playerAssignment.worldPosition)
    > PLANAR_RESOLUTION_GEOMETRY.expectedStartTolerance;
  const anyRemaining = actorResults.some(actor => actor.remainingLayer > 0);

  let failureCode: PlanarFailureCode | null = null;
  let failureReason = '';
  if (overhitIds.size > 0) {
    failureCode = 'mine-overhit';
    failureReason = '地雷爆炸命中已無減算層數的角色。';
  } else if (anyRemaining && playerWrongFacing) {
    failureCode = 'wrong-direction';
    failureReason = `減算炸彈大爆炸：強制移動方向錯誤，玩家剩餘 ${remaining.you} 層。`;
  } else if (anyRemaining && playerWrongStart) {
    failureCode = 'wrong-start';
    failureReason = `減算炸彈大爆炸：起始站位偏移，玩家剩餘 ${remaining.you} 層。`;
  } else if (anyRemaining) {
    failureCode = 'remaining-layers';
    const remainingMembers = actorResults.filter(actor => actor.remainingLayer > 0)
      .map(actor => `${actor.id} ${actor.remainingLayer} 層`).join('、');
    failureReason = `減算炸彈層數未歸零並引發大爆炸：${remainingMembers}。`;
  } else if (!allMinesTriggered) {
    failureCode = 'mines-remaining';
    failureReason = `尚有 ${planarMineCells(question.gap).length - mineEvents.length} 顆地雷未拆除，造成全場大爆炸。`;
  } else if (doubleHitActorIds.length > 0) {
    failureCode = 'stack-double-hit';
    failureReason = '同一角色重複承受兩組雙數爆擊，受到魔法受傷加重影響而死亡。';
  } else if (stackChecks.some(check => !check.success)) {
    failureCode = 'stack-solo';
    failureReason = '雙數爆擊未由兩名角色共同承受。';
  }

  return {
    paths,
    mineEvents,
    actorResults,
    stackChecks,
    triggeredMineKeys: mineEvents.map(event => event.mineKey),
    allMinesTriggered,
    stackSucceeded,
    doubleHitActorIds,
    success: failureCode === null,
    failureCode,
    failureReason,
    failureAtMs: failureCode === 'mine-overhit'
      ? firstOverhitAtMs
      : failureCode === 'stack-solo' || failureCode === 'stack-double-hit'
        ? PLANAR_RESOLUTION_TIMING.doubleImpactAtMs + PLANAR_RESOLUTION_TIMING.doubleImpactDurationMs
        : failureCode
          ? PLANAR_RESOLUTION_TIMING.forcedMoveDurationMs
          : null
  };
}
