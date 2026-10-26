import { ROLES, type Role, type RoleMap } from '../../domain/roles.ts';
import type { BubbleConfigurationId, BubbleVector } from './bubbles.ts';
import type { MechanicKind, MechanicOrder } from './bubble-timeline.ts';

export type BubblePartySide = 'left' | 'right';
export type BubblePartyController = 'player' | 'npc';

export interface BubblePartyMember {
  role: Role;
  label: string;
  side: BubblePartySide;
  controller: BubblePartyController;
  position: BubbleVector;
  mechanicOrder: MechanicOrder;
}

export const BUBBLE_PARTY_ROLE_LABELS: Readonly<RoleMap<string>> = {
  T: 'T',
  H: 'H',
  D1: 'D1',
  D2: 'D2'
};

export const BUBBLE_PARTY_SIDES: Readonly<RoleMap<BubblePartySide>> = {
  T: 'left',
  H: 'right',
  D1: 'left',
  D2: 'right'
};

const INITIAL_PARTY_POSITIONS: Readonly<RoleMap<Readonly<BubbleVector>>> = {
  T: { x: 2, y: 1.7 },
  H: { x: 2, y: 2.3 },
  D1: { x: 1.7, y: 2 },
  D2: { x: 2.3, y: 2 }
};

// First-stage NPC movement. The start time is recorded when the player answers correctly.
// NPC movement for the first Hydration Bomb. Routes are intentionally authored
// in arena-tile coordinates so timing, speed, and waypoints can be calibrated
// against footage without touching the animation loop.
export const PARTY_MOVE_SPEED_TILES_PER_SECOND = 0.7;
export const NPC_FIRST_AOE_ROUTE_START_SECONDS = 13;
export const NPC_FIRST_AOE_ESCAPE_START_SECONDS = 21;
export const NPC_SECOND_STAGE_START_SECONDS = 21;
export const NPC_SECOND_STAGE_RESOLVE_SECONDS = 26;
export const NPC_BUBBLE_LOOKAHEAD_SECONDS = 3.2;
export const NPC_SECOND_STAGE_BUBBLE_LOOKAHEAD_SECONDS = 3.2;
export const NPC_GROUND_AOE_LOOKAHEAD_SECONDS = 3.1;
export const NPC_AVOIDANCE_DIRECTION_COUNT = 32;

export interface NpcRouteWaypoint {
  atSeconds: number;
  position: Readonly<BubbleVector>;
}

export const NPC_FIRST_TARGETS: Readonly<Record<MechanicKind, Readonly<RoleMap<Readonly<BubbleVector>>>>> = {
  stack: {
    T: { x: 0.5, y: 0.5 },
    H: { x: 3.5, y: 3.5 },
    D1: { x: 0.5, y: 0.5 },
    D2: { x: 3.5, y: 3.5 }
  },
  spread: {
    T: { x: 1.5, y: 1.5 },
    H: { x: 2.5, y: 2.5 },
    D1: { x: 1.5, y: 2.5 },
    D2: { x: 2.5, y: 1.5 }
  }
};

type FirstAoeRoutes = Readonly<Record<
  MechanicKind,
  Readonly<Record<BubbleConfigurationId, Readonly<RoleMap<readonly NpcRouteWaypoint[]>>>>
>>;

type SecondStageRoutes = Readonly<Record<
  MechanicOrder,
  Readonly<Record<BubbleConfigurationId, Readonly<RoleMap<readonly NpcRouteWaypoint[]>>>>
>>;

const waypoint = (atSeconds: number, x: number, y: number): NpcRouteWaypoint => ({
  atSeconds,
  position: { x, y }
});

export const NPC_FIRST_AOE_ROUTES: FirstAoeRoutes = {
  stack: {
    A: {
      T: [waypoint(13, 0.5, 1.5), waypoint(17, 0.5, 0.5), waypoint(19, 1.2, 0.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 0.5, 0.5)],
      D1: [waypoint(13, 0.5, 1.5), waypoint(17, 0.5, 0.5), waypoint(19, 1.2, 0.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 0.5, 0.5)],
      H: [waypoint(13, 3.5, 2.5), waypoint(17, 3.5, 3.5), waypoint(19, 2.8, 3.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 3.5, 3.5)],
      D2: [waypoint(13, 3.5, 2.5), waypoint(17, 3.5, 3.5), waypoint(19, 2.8, 3.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 3.5, 3.5)]
    },
    B: {
      T: [waypoint(13, 1.5, 0.5), waypoint(17, 0.5, 0.5), waypoint(19, 0.5, 1.2), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 0.5, 0.5)],
      D1: [waypoint(13, 1.5, 0.5), waypoint(17, 0.5, 0.5), waypoint(19, 0.5, 1.2), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 0.5, 0.5)],
      H: [waypoint(13, 2.5, 3.5), waypoint(17, 3.5, 3.5), waypoint(19, 3.5, 2.8), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 3.5, 3.5)],
      D2: [waypoint(13, 2.5, 3.5), waypoint(17, 3.5, 3.5), waypoint(19, 3.5, 2.8), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 3.5, 3.5)]
    }
  },
  spread: {
    A: {
      T: [waypoint(13, 1.5, 1.5), waypoint(17, 0.5, 1.5), waypoint(19, 0.5, 0.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 1.2, 0.5)],
      D2: [waypoint(13, 2.5, 1.5), waypoint(17, 2.5, 0.5), waypoint(19, 3.5, 0.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 3.5, 1.2)],
      D1: [waypoint(13, 1.5, 2.5), waypoint(17, 1.5, 3.5), waypoint(19, 0.5, 3.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 0.5, 2.8)],
      H: [waypoint(13, 2.5, 2.5), waypoint(17, 3.5, 2.5), waypoint(19, 3.5, 3.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 2.8, 3.5)]
    },
    B: {
      T: [waypoint(13, 1.5, 1.5), waypoint(17, 0.5, 1.5), waypoint(19, 0.5, 0.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 0.5, 1.2)],
      D2: [waypoint(13, 2.5, 1.5), waypoint(17, 2.5, 0.5), waypoint(19, 3.5, 0.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 2.8, 0.5)],
      D1: [waypoint(13, 1.5, 2.5), waypoint(17, 1.5, 3.5), waypoint(19, 0.5, 3.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 1.2, 3.5)],
      H: [waypoint(13, 2.5, 2.5), waypoint(17, 3.5, 2.5), waypoint(19, 3.5, 3.5), waypoint(NPC_FIRST_AOE_ESCAPE_START_SECONDS, 3.5, 2.8)]
    }
  }
};

// Movement after the first T+21 resolution. Configuration A follows the supplied
// stack-first reference: D1/D2 keep circling in their original corners while
// T/H follow the arena edge to the other open corners. Configuration B mirrors
// that clockwise/counter-clockwise choice. Spread-first converges into the two
// fixed light-party stacks on the left and right halves.
export const NPC_SECOND_STAGE_ROUTES: SecondStageRoutes = {
  'stack-first': {
    A: {
      T: [waypoint(21, 0.8, 2.2), waypoint(26, 3.5, 0.5)],
      D1: [waypoint(21, 1.5, 0.18), waypoint(26, 0.5, 0.5)],
      H: [waypoint(21, 3.2, 1.8), waypoint(26, 0.5, 3.5)],
      D2: [waypoint(21, 2.5, 3.82), waypoint(26, 3.5, 3.5)]
    },
    B: {
      T: [waypoint(21, 2.2, 0.8), waypoint(26, 0.5, 3.5)],
      D1: [waypoint(21, 0.18, 1.5), waypoint(26, 0.5, 0.5)],
      H: [waypoint(21, 1.8, 3.2), waypoint(26, 3.5, 0.5)],
      D2: [waypoint(21, 3.82, 2.5), waypoint(26, 3.5, 3.5)]
    }
  },
  'spread-first': {
    A: {
      T: [waypoint(21, 0.18, 2.35), waypoint(26, 0.18, 2.35)],
      D1: [waypoint(21, 0.18, 2.35), waypoint(26, 0.18, 2.35)],
      H: [waypoint(21, 3.82, 1.65), waypoint(26, 3.82, 1.65)],
      D2: [waypoint(21, 3.82, 1.65), waypoint(26, 3.82, 1.65)]
    },
    B: {
      T: [waypoint(21, 1.3, 2), waypoint(26, 1.3, 2)],
      D1: [waypoint(21, 1.3, 2), waypoint(26, 1.3, 2)],
      H: [waypoint(21, 2.7, 2), waypoint(26, 2.7, 2)],
      D2: [waypoint(21, 2.7, 2), waypoint(26, 2.7, 2)]
    }
  }
};

export function initialBubblePartyPositions(): RoleMap<BubbleVector> {
  return Object.fromEntries(
    ROLES.map(role => [role, { ...INITIAL_PARTY_POSITIONS[role] }])
  ) as RoleMap<BubbleVector>;
}

export function bubblePartyMembers(
  positions: Readonly<RoleMap<BubbleVector>>,
  playerRole: Role,
  mechanicOrder: MechanicOrder
): BubblePartyMember[] {
  return ROLES.map(role => ({
    role,
    label: BUBBLE_PARTY_ROLE_LABELS[role],
    side: BUBBLE_PARTY_SIDES[role],
    controller: role === playerRole ? 'player' : 'npc',
    position: positions[role],
    mechanicOrder
  }));
}

export function firstMechanicKind(order: MechanicOrder): MechanicKind {
  return order === 'stack-first' ? 'stack' : 'spread';
}

export function npcFirstAoeRouteTarget(
  role: Role,
  order: MechanicOrder,
  configuration: BubbleConfigurationId,
  elapsedSeconds: number
): BubbleVector {
  const route = NPC_FIRST_AOE_ROUTES[firstMechanicKind(order)][configuration][role];
  const activeWaypoint = [...route]
    .reverse()
    .find(item => elapsedSeconds >= item.atSeconds);
  return activeWaypoint
    ? { ...activeWaypoint.position }
    : { ...NPC_FIRST_TARGETS[firstMechanicKind(order)][role] };
}

export function npcSecondStageRouteTarget(
  role: Role,
  order: MechanicOrder,
  configuration: BubbleConfigurationId,
  elapsedSeconds: number
): BubbleVector {
  const route = NPC_SECOND_STAGE_ROUTES[order][configuration][role];
  const activeWaypoint = [...route]
    .reverse()
    .find(item => elapsedSeconds >= item.atSeconds);
  return { ...(activeWaypoint ?? route[0]).position };
}

export function movePartyMemberToward(
  position: Readonly<BubbleVector>,
  target: Readonly<BubbleVector>,
  deltaSeconds: number,
  speedTilesPerSecond = PARTY_MOVE_SPEED_TILES_PER_SECOND
): BubbleVector {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.hypot(dx, dy);
  const maximumDistance = Math.max(0, deltaSeconds) * speedTilesPerSecond;
  if (distance === 0 || distance <= maximumDistance) return { ...target };
  const scale = maximumDistance / distance;
  return {
    x: position.x + dx * scale,
    y: position.y + dy * scale
  };
}

export function npcFirstStagePositionAt(
  role: Role,
  order: MechanicOrder,
  elapsedSeconds: number,
  moveStartedAtSeconds: number | null
): BubbleVector {
  const origin = INITIAL_PARTY_POSITIONS[role];
  const target = NPC_FIRST_TARGETS[firstMechanicKind(order)][role];
  if (moveStartedAtSeconds === null) return { ...origin };
  return movePartyMemberToward(
    origin,
    target,
    Math.max(0, elapsedSeconds - moveStartedAtSeconds)
  );
}
