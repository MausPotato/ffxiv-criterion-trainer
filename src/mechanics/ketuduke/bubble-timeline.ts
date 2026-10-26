import type { BubbleVector } from './bubbles.ts';
import { ROLES, type Role, type RoleMap } from '../../domain/roles.ts';

export type MechanicKind = 'stack' | 'spread';
export type MechanicOrder = 'stack-first' | 'spread-first';
export type MechanicSlot = 'first' | 'second';

export interface GroundAoeSchedule {
  id: string;
  cycle: 1 | 2;
  round: 1 | 2 | 3;
  spawnAtSeconds: number;
  explodeAtSeconds: number;
}

export interface GroundAoeSnapshot extends GroundAoeSchedule {
  sourceRole: Role;
  position: BubbleVector;
}

export interface MechanicResolution {
  slot: MechanicSlot;
  resolveAtSeconds: number;
}

export interface PartyMechanicResult {
  success: boolean;
  message: string;
}

export type BubbleTimelineEvent =
  | { type: 'ground-aoe-spawn'; schedule: GroundAoeSchedule }
  | { type: 'ground-aoe-explode'; schedule: GroundAoeSchedule }
  | { type: 'mechanic-resolve'; resolution: MechanicResolution };

// Full encounter timeline. All values remain centralized for later video calibration.
export const FIRST_DEBUFF_APPEAR_AT_SECONDS = 0;
export const FIRST_DEBUFF_DURATION_SECONDS = 21;
export const SECOND_DEBUFF_APPEAR_AT_SECONDS = 2;
export const SECOND_DEBUFF_DURATION_SECONDS = 24;

export const BUBBLES_SPAWN_AT_SECONDS = 13;
export const FIRST_HYDRATION_CAST_START_AT_SECONDS = 13;
export const FIRST_HYDRATION_CAST_END_AT_SECONDS = 16;
export const BUBBLES_MOVE_AT_SECONDS = 16;
export const SECOND_HYDRATION_CAST_START_AT_SECONDS = 22;
export const SECOND_HYDRATION_CAST_END_AT_SECONDS = 25;

export const FIRST_MECHANIC_RESOLVE_AT_SECONDS = 21;
export const SECOND_MECHANIC_RESOLVE_AT_SECONDS = 26;
export const MECHANIC_PREVIEW_LEAD_SECONDS = 5;
export const MECHANIC_RESOLUTION_DISPLAY_SECONDS = 0.45;
export const MECHANIC_RESOLUTIONS: readonly MechanicResolution[] = [
  { slot: 'first', resolveAtSeconds: FIRST_MECHANIC_RESOLVE_AT_SECONDS },
  { slot: 'second', resolveAtSeconds: SECOND_MECHANIC_RESOLVE_AT_SECONDS }
];

export const GROUND_AOE_DIAMETER_TILES = 1;
export const GROUND_AOE_FUSE_SECONDS = 3;
export const GROUND_AOE_EXPLOSION_DISPLAY_SECONDS = 0.35;
export const GROUND_AOE_SPAWN_TIMES_SECONDS = [17, 19, 21, 26, 28, 30] as const;
export const SPREAD_DIAMETER_TILES = 2.2;
export const STACK_DIAMETER_TILES = 1;

export const STACK_PARTY_PAIRS: readonly (readonly [Role, Role])[] = [
  ['T', 'D1'],
  ['H', 'D2']
];

export const GROUND_AOE_SCHEDULES: readonly GroundAoeSchedule[] =
  GROUND_AOE_SPAWN_TIMES_SECONDS.map((spawnAtSeconds, index) => ({
    id: `cycle-${index < 3 ? 1 : 2}-round-${index % 3 + 1}`,
    cycle: (index < 3 ? 1 : 2) as GroundAoeSchedule['cycle'],
    round: (index % 3 + 1) as GroundAoeSchedule['round'],
    spawnAtSeconds,
    explodeAtSeconds: spawnAtSeconds + GROUND_AOE_FUSE_SECONDS
  }));

export const ENCOUNTER_END_AT_SECONDS = Math.max(
  ...GROUND_AOE_SCHEDULES.map(schedule => schedule.explodeAtSeconds)
) + GROUND_AOE_EXPLOSION_DISPLAY_SECONDS;

const TIMELINE_EVENTS: readonly BubbleTimelineEvent[] = [
  ...GROUND_AOE_SCHEDULES.flatMap<BubbleTimelineEvent>(schedule => [
    { type: 'ground-aoe-spawn', schedule },
    { type: 'ground-aoe-explode', schedule }
  ]),
  ...MECHANIC_RESOLUTIONS.map<BubbleTimelineEvent>(resolution => ({
    type: 'mechanic-resolve',
    resolution
  }))
].sort((left, right) => eventTime(left) - eventTime(right));

export function eventTime(event: BubbleTimelineEvent): number {
  return event.type === 'ground-aoe-spawn'
    ? event.schedule.spawnAtSeconds
    : event.type === 'ground-aoe-explode'
      ? event.schedule.explodeAtSeconds
      : event.resolution.resolveAtSeconds;
}

/** Returns events crossed in (previousSeconds, nextSeconds], once per threshold. */
export function timelineEventsBetween(
  previousSeconds: number,
  nextSeconds: number
): readonly BubbleTimelineEvent[] {
  return TIMELINE_EVENTS.filter(event => {
    const time = eventTime(event);
    return previousSeconds < time && nextSeconds >= time;
  });
}

export function groundAoeSnapshotsForRoles(
  schedule: GroundAoeSchedule,
  positions: Readonly<RoleMap<BubbleVector>>,
  sourceRoles: readonly Role[]
): GroundAoeSnapshot[] {
  return sourceRoles.map(role => ({
    ...schedule,
    id: `${schedule.id}-${role}`,
    sourceRole: role,
    position: { ...positions[role] }
  }));
}

export function randomMechanicOrder(random: () => number = Math.random): MechanicOrder {
  return random() < 0.5 ? 'stack-first' : 'spread-first';
}

export function mechanicKindForSlot(
  order: MechanicOrder,
  slot: MechanicSlot
): MechanicKind {
  const first: MechanicKind = order === 'stack-first' ? 'stack' : 'spread';
  return slot === 'first' ? first : first === 'stack' ? 'spread' : 'stack';
}

export function circlesTouch(
  first: BubbleVector,
  firstRadius: number,
  second: BubbleVector,
  secondRadius: number
): boolean {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  const radius = firstRadius + secondRadius;
  return deltaX * deltaX + deltaY * deltaY <= radius * radius;
}

export function resolvePartyMechanic(
  kind: MechanicKind,
  positions: Readonly<RoleMap<BubbleVector>>,
  actorRadiusTiles: number
): PartyMechanicResult {
  if (kind === 'spread') {
    for (const sourceRole of ROLES) {
      for (const targetRole of ROLES) {
        if (sourceRole === targetRole) continue;
        if (circlesTouch(
          positions[sourceRole],
          SPREAD_DIAMETER_TILES / 2,
          positions[targetRole],
          actorRadiusTiles
        )) {
          return {
            success: false,
            message: `${sourceRole} 的分散範圍命中 ${targetRole}`
          };
        }
      }
    }
    return { success: true, message: '四人分散成功' };
  }

  for (const pair of STACK_PARTY_PAIRS) {
    for (const sourceRole of pair) {
      const rolesInRange = ROLES.filter(role => circlesTouch(
        positions[sourceRole],
        STACK_DIAMETER_TILES / 2,
        positions[role],
        actorRadiusTiles
      ));
      const correctPair = rolesInRange.length === pair.length
        && pair.every(role => rolesInRange.includes(role));
      if (!correctPair) {
        const occupants = rolesInRange.length > 0 ? rolesInRange.join('＋') : '無人';
        return {
          success: false,
          message: `${pair.join('＋')} 分攤失敗（${sourceRole} 圈內：${occupants}）`
        };
      }
    }
  }
  return { success: true, message: 'T＋D1、H＋D2 雙人分攤成功' };
}
