import { computed, onScopeDispose, ref } from 'vue';
import { ROLES, type Role, type RoleMap } from '../domain/roles.ts';
import {
  BUBBLE_CONFIGURATIONS,
  BUBBLE_DEFAULT_SPEED_TILES_PER_SECOND,
  BUBBLE_RADIUS_TILES,
  bubblePositionAt,
  isBubbleVisible,
  randomBubbleConfiguration,
  type BubbleConfigurationId,
  type BubbleDefinition,
  type BubbleVector
} from '../mechanics/ketuduke/bubbles.ts';
import {
  interpolatePosition,
  sweptCircleCollisionTime
} from '../mechanics/ketuduke/collision.ts';
import {
  BUBBLES_MOVE_AT_SECONDS,
  BUBBLES_SPAWN_AT_SECONDS,
  ENCOUNTER_END_AT_SECONDS,
  FIRST_DEBUFF_APPEAR_AT_SECONDS,
  FIRST_DEBUFF_DURATION_SECONDS,
  GROUND_AOE_DIAMETER_TILES,
  GROUND_AOE_EXPLOSION_DISPLAY_SECONDS,
  MECHANIC_PREVIEW_LEAD_SECONDS,
  MECHANIC_RESOLUTION_DISPLAY_SECONDS,
  MECHANIC_RESOLUTIONS,
  SECOND_DEBUFF_APPEAR_AT_SECONDS,
  SECOND_DEBUFF_DURATION_SECONDS,
  SPREAD_DIAMETER_TILES,
  STACK_DIAMETER_TILES,
  circlesTouch,
  groundAoeSnapshotsForRoles,
  mechanicKindForSlot,
  randomMechanicOrder,
  resolvePartyMechanic,
  timelineEventsBetween,
  type GroundAoeSnapshot,
  type MechanicKind,
  type MechanicOrder,
  type MechanicSlot
} from '../mechanics/ketuduke/bubble-timeline.ts';
import {
  NPC_FIRST_AOE_ROUTE_START_SECONDS,
  NPC_AVOIDANCE_DIRECTION_COUNT,
  NPC_BUBBLE_LOOKAHEAD_SECONDS,
  NPC_GROUND_AOE_LOOKAHEAD_SECONDS,
  NPC_SECOND_STAGE_BUBBLE_LOOKAHEAD_SECONDS,
  NPC_SECOND_STAGE_START_SECONDS,
  PARTY_MOVE_SPEED_TILES_PER_SECOND,
  bubblePartyMembers,
  initialBubblePartyPositions,
  movePartyMemberToward,
  npcFirstAoeRouteTarget,
  npcFirstStagePositionAt,
  npcSecondStageRouteTarget
} from '../mechanics/ketuduke/bubble-party.ts';
import {
  PLAYER_RADIUS_TILES,
  clampPlayerPosition
} from '../presentation/ketuduke/player-drag.ts';

export type BubbleConfigurationMode = 'random' | BubbleConfigurationId;

interface BubbleCollision {
  bubble: BubbleDefinition;
  time: number;
}

export interface MechanicRangePreview {
  position: BubbleVector;
  diameterTiles: number;
  countdownSeconds: number;
  resolving: boolean;
}

export interface VisibleDebuff {
  slot: MechanicSlot;
  kind: MechanicKind;
  remainingSeconds: number;
}

export interface NpcDebugAlert {
  id: string;
  role: Role;
  hazard: 'bubble' | 'ground-aoe';
  atSeconds: number;
  message: string;
}

export function useBubblePreview() {
  const configurationMode = ref<BubbleConfigurationMode>('random');
  const configuration = ref(randomBubbleConfiguration());
  const playerRole = ref<Role>('T');
  const partyPositions = ref<RoleMap<BubbleVector>>(initialBubblePartyPositions());
  const playerMoveTarget = ref<BubbleVector | null>(null);
  const distanceTiles = ref(0);
  const speed = ref(BUBBLE_DEFAULT_SPEED_TILES_PER_SECOND);
  const playing = ref(true);
  const dead = ref(false);
  const deathCause = ref<string | null>(null);
  const capturedBubbleId = ref<string | null>(null);
  const capturedRole = ref<Role | null>(null);
  const capturedBubblePosition = ref<BubbleVector | null>(null);
  const encounterElapsedSeconds = ref(0);
  const groundAoes = ref<GroundAoeSnapshot[]>([]);
  const resolutionPositions = ref<Partial<Record<MechanicSlot, BubbleVector>>>({});
  const mechanicOrder = ref<MechanicOrder>(randomMechanicOrder());
  const selectedMechanicOrder = ref<MechanicOrder | null>(null);
  const npcFirstMoveStartedAtSeconds = ref<number | null>(null);
  const firstResolutionSucceeded = ref(false);
  const secondResolutionSucceeded = ref(false);
  const orderFeedback = ref<'correct' | 'incorrect' | null>(null);
  const incorrectOrderAttempts = ref(0);
  const orderPenaltyActive = ref(false);
  const forcedCorrectOrder = ref<MechanicOrder | null>(null);
  const npcDebugAlerts = ref<NpcDebugAlert[]>([]);
  const reportedNpcHazards = new Set<string>();
  let animationFrame: number | null = null;
  let captureAnimationFrame: number | null = null;
  let orderPenaltyTimer: number | null = null;
  let previousTimestamp: number | null = null;

  const playerPosition = computed(() => partyPositions.value[playerRole.value]);
  const partyMembers = computed(() => bubblePartyMembers(
    partyPositions.value,
    playerRole.value,
    mechanicOrder.value
  ));
  const npcMembers = computed(() => partyMembers.value.filter(member => member.controller === 'npc'));

  function updatePartyPosition(role: Role, position: BubbleVector): void {
    partyPositions.value = {
      ...partyPositions.value,
      [role]: position
    };
  }

  function reportNpcHazard(
    role: Role,
    hazard: NpcDebugAlert['hazard'],
    hazardId: string,
    atSeconds: number,
    message: string
  ): void {
    const key = `${role}:${hazard}:${hazardId}`;
    if (reportedNpcHazards.has(key)) return;
    reportedNpcHazards.add(key);
    npcDebugAlerts.value = [
      ...npcDebugAlerts.value,
      { id: key, role, hazard, atSeconds, message }
    ].slice(-8);
  }

  function updateNpcPositions(
    previousSeconds: number,
    elapsedSeconds: number,
    previousDistance: number,
    nextDistance: number
  ): void {
    const nextPositions = { ...partyPositions.value };
    for (const role of ROLES) {
      if (role === playerRole.value || role === capturedRole.value) continue;
      const current = partyPositions.value[role];
      const followingFirstAoeRoute = selectedMechanicOrder.value !== null
        && elapsedSeconds >= NPC_FIRST_AOE_ROUTE_START_SECONDS;
      const followingSecondStageRoute = firstResolutionSucceeded.value
        && elapsedSeconds >= NPC_SECOND_STAGE_START_SECONDS;
      const routeTarget = followingSecondStageRoute
        ? npcSecondStageRouteTarget(
            role,
            mechanicOrder.value,
            configuration.value.id,
            elapsedSeconds
          )
        : followingFirstAoeRoute
          ? npcFirstAoeRouteTarget(
            role,
            mechanicOrder.value,
            configuration.value.id,
            elapsedSeconds
          )
          : null;
      const candidate = followingFirstAoeRoute
        ? movePartyMemberToward(
            current,
            routeTarget!,
            elapsedSeconds - previousSeconds,
            PARTY_MOVE_SPEED_TILES_PER_SECOND
          )
        : npcFirstStagePositionAt(
            role,
            mechanicOrder.value,
            elapsedSeconds,
            npcFirstMoveStartedAtSeconds.value
          );
      let selectedCandidate = candidate;
      if (routeTarget && elapsedSeconds >= BUBBLES_SPAWN_AT_SECONDS) {
        const deltaSeconds = Math.max(0, elapsedSeconds - previousSeconds);
        const stepDistance = deltaSeconds * PARTY_MOVE_SPEED_TILES_PER_SECOND;
        const bubbleLookaheadSeconds = followingSecondStageRoute
          ? NPC_SECOND_STAGE_BUBBLE_LOOKAHEAD_SECONDS
          : NPC_BUBBLE_LOOKAHEAD_SECONDS;
        const targetAngle = Math.atan2(
          routeTarget.y - current.y,
          routeTarget.x - current.x
        );
        const projectedBubbleMovementSeconds = Math.max(
          0,
          elapsedSeconds + bubbleLookaheadSeconds
            - Math.max(elapsedSeconds, BUBBLES_MOVE_AT_SECONDS)
        );
        const projectedBubbleDistance = nextDistance
          + projectedBubbleMovementSeconds * speed.value;
        const directionOffsets = Array.from(
          { length: NPC_AVOIDANCE_DIRECTION_COUNT },
          (_, index) => {
            if (index === 0) return 0;
            const magnitude = Math.ceil(index / 2);
            return (index % 2 === 1 ? 1 : -1)
              * magnitude * Math.PI * 2 / NPC_AVOIDANCE_DIRECTION_COUNT;
          }
        );
        const movementOptions = [candidate, ...directionOffsets.map(offset => {
          const angle = targetAngle + offset;
          return clampPlayerPosition({
            x: current.x + Math.cos(angle) * stepDistance,
            y: current.y + Math.sin(angle) * stepDistance
          });
        })];
        const safeOption = movementOptions
          .map(position => {
            const dx = position.x - current.x;
            const dy = position.y - current.y;
            const length = Math.hypot(dx, dy);
            const projectedPosition = length > 0
              ? clampPlayerPosition({
                  x: position.x + dx / length
                    * PARTY_MOVE_SPEED_TILES_PER_SECOND * bubbleLookaheadSeconds,
                  y: position.y + dy / length
                    * PARTY_MOVE_SPEED_TILES_PER_SECOND * bubbleLookaheadSeconds
                })
              : position;
            const immediateCollision = bubbleCollisionTime(
              previousDistance,
              nextDistance,
              current,
              position,
              false
            );
            const projectedCollision = bubbleCollisionTime(
              nextDistance,
              projectedBubbleDistance,
              position,
              projectedPosition,
              false
            );
            const avoidsNpcGroundAoes = groundAoes.value
              .filter(aoe => (
                aoe.sourceRole !== playerRole.value
                && aoe.explodeAtSeconds > elapsedSeconds
                && aoe.explodeAtSeconds
                  <= elapsedSeconds + NPC_GROUND_AOE_LOOKAHEAD_SECONDS
              ))
              .every(aoe => {
                const secondsUntilExplosion = aoe.explodeAtSeconds - elapsedSeconds;
                const positionAtExplosion = length > 0
                  ? clampPlayerPosition({
                      x: position.x + dx / length
                        * PARTY_MOVE_SPEED_TILES_PER_SECOND * secondsUntilExplosion,
                      y: position.y + dy / length
                        * PARTY_MOVE_SPEED_TILES_PER_SECOND * secondsUntilExplosion
                    })
                  : position;
                return !circlesTouch(
                  aoe.position,
                  GROUND_AOE_DIAMETER_TILES / 2,
                  positionAtExplosion,
                  PLAYER_RADIUS_TILES
                );
              });
            return {
              position,
              safe: immediateCollision === null
                && projectedCollision === null
                && avoidsNpcGroundAoes,
              distanceToTarget: Math.hypot(
                projectedPosition.x - routeTarget.x,
                projectedPosition.y - routeTarget.y
              )
            };
          })
          .filter(option => option.safe)
          .sort((left, right) => left.distanceToTarget - right.distanceToTarget)[0];
        if (safeOption) selectedCandidate = safeOption.position;
      }
      const collision = elapsedSeconds >= BUBBLES_SPAWN_AT_SECONDS
        ? bubbleCollisionTime(previousDistance, nextDistance, current, selectedCandidate, false)
        : null;
      if (collision === null) {
        nextPositions[role] = clampPlayerPosition(selectedCandidate);
        continue;
      }
      if (routeTarget) {
        const stepDistance = Math.max(0, elapsedSeconds - previousSeconds)
          * PARTY_MOVE_SPEED_TILES_PER_SECOND;
        const baseAngle = Math.atan2(
          routeTarget.y - current.y,
          routeTarget.x - current.x
        );
        const detour = Array.from({ length: 16 }, (_, index) => {
          const angle = baseAngle + (index + 1) * Math.PI / 8;
          return clampPlayerPosition({
            x: current.x + Math.cos(angle) * stepDistance,
            y: current.y + Math.sin(angle) * stepDistance
          });
        })
          .filter(position => bubbleCollisionTime(
            previousDistance,
            nextDistance,
            current,
            position,
            false
          ) === null)
          .sort((left, right) => (
            Math.hypot(left.x - routeTarget.x, left.y - routeTarget.y)
            - Math.hypot(right.x - routeTarget.x, right.y - routeTarget.y)
          ))[0];
        if (detour) {
          nextPositions[role] = detour;
          continue;
        }
      }
      const safeTime = Math.max(0, collision.time - 0.01);
      nextPositions[role] = clampPlayerPosition(interpolatePosition(current, selectedCandidate, safeTime));
      reportNpcHazard(
        role,
        'bubble',
        collision.bubble.id,
        elapsedSeconds,
        `${role} 的預設路線碰到泡泡 ${collision.bubble.id}，已停在接觸點前。`
      );
    }
    partyPositions.value = nextPositions;
  }

  const bubblesSpawned = computed(() => (
    encounterElapsedSeconds.value >= BUBBLES_SPAWN_AT_SECONDS
  ));
  const waitingToMove = computed(() => (
    encounterElapsedSeconds.value < BUBBLES_MOVE_AT_SECONDS
  ));
  const startDelayRemainingSeconds = computed(() => Math.max(
    0,
    BUBBLES_MOVE_AT_SECONDS - encounterElapsedSeconds.value
  ));

  const bubbles = computed(() => {
    if (!bubblesSpawned.value) return [];
    return configuration.value.bubbles.flatMap(bubble => {
      const position = bubble.id === capturedBubbleId.value && capturedBubblePosition.value
        ? capturedBubblePosition.value
        : bubblePositionAt(bubble, distanceTiles.value);
      return isBubbleVisible(position) ? [{ ...bubble, ...position }] : [];
    });
  });

  const bubblesFinished = computed(() => bubblesSpawned.value
    && configuration.value.bubbles.every(bubble => (
      bubble.id === capturedBubbleId.value
      || !isBubbleVisible(bubblePositionAt(bubble, distanceTiles.value))
    )));
  const timelineFinished = computed(() => (
    encounterElapsedSeconds.value >= ENCOUNTER_END_AT_SECONDS
  ));
  const finished = computed(() => bubblesFinished.value && timelineFinished.value);
  const activeGroundAoes = computed(() => groundAoes.value.filter(aoe => (
    encounterElapsedSeconds.value
      <= aoe.explodeAtSeconds + GROUND_AOE_EXPLOSION_DISPLAY_SECONDS
  )));

  const visibleDebuffs = computed<VisibleDebuff[]>(() => {
    const elapsed = encounterElapsedSeconds.value;
    const definitions = [
      {
        slot: 'first' as const,
        appearsAt: FIRST_DEBUFF_APPEAR_AT_SECONDS,
        expiresAt: FIRST_DEBUFF_APPEAR_AT_SECONDS + FIRST_DEBUFF_DURATION_SECONDS
      },
      {
        slot: 'second' as const,
        appearsAt: SECOND_DEBUFF_APPEAR_AT_SECONDS,
        expiresAt: SECOND_DEBUFF_APPEAR_AT_SECONDS + SECOND_DEBUFF_DURATION_SECONDS
      }
    ];
    return definitions.flatMap(definition => (
      elapsed >= definition.appearsAt && elapsed < definition.expiresAt
        ? [{
            slot: definition.slot,
            kind: mechanicKindForSlot(mechanicOrder.value, definition.slot),
            remainingSeconds: Math.max(0, definition.expiresAt - elapsed)
          }]
        : []
    ));
  });

  function rangePreviewFor(kind: MechanicKind): MechanicRangePreview | null {
    const resolution = MECHANIC_RESOLUTIONS.find(item => (
      mechanicKindForSlot(mechanicOrder.value, item.slot) === kind
    ));
    if (!resolution) return null;
    const elapsed = encounterElapsedSeconds.value;
    if (elapsed < resolution.resolveAtSeconds - MECHANIC_PREVIEW_LEAD_SECONDS
      || elapsed > resolution.resolveAtSeconds + MECHANIC_RESOLUTION_DISPLAY_SECONDS) return null;
    return {
      position: resolutionPositions.value[resolution.slot] ?? playerPosition.value,
      diameterTiles: kind === 'spread' ? SPREAD_DIAMETER_TILES : STACK_DIAMETER_TILES,
      countdownSeconds: Math.max(0, resolution.resolveAtSeconds - elapsed),
      resolving: elapsed >= resolution.resolveAtSeconds
    };
  }

  const spreadPreview = computed(() => rangePreviewFor('spread'));
  const stackPreview = computed(() => rangePreviewFor('stack'));

  function die(cause: string): void {
    deathCause.value = cause;
    dead.value = true;
  }

  function bubbleCollisionTime(
    previousDistance: number,
    nextDistance: number,
    playerStart: BubbleVector,
    playerEnd: BubbleVector,
    ignoreCapturedBubble = true
  ): BubbleCollision | null {
    let earliest: BubbleCollision | null = null;
    for (const bubble of configuration.value.bubbles) {
      if (ignoreCapturedBubble && bubble.id === capturedBubbleId.value) continue;
      const bubbleStart = bubble.id === capturedBubbleId.value && capturedBubblePosition.value
        ? capturedBubblePosition.value
        : bubblePositionAt(bubble, previousDistance);
      const bubbleEnd = bubble.id === capturedBubbleId.value && capturedBubblePosition.value
        ? capturedBubblePosition.value
        : bubblePositionAt(bubble, nextDistance);
      const time = sweptCircleCollisionTime(
        bubbleStart,
        bubbleEnd,
        BUBBLE_RADIUS_TILES,
        playerStart,
        playerEnd,
        PLAYER_RADIUS_TILES
      );
      if (time !== null && (earliest === null || time < earliest.time)) {
        earliest = { bubble, time };
      }
    }
    return earliest;
  }

  function captureActor(
    role: Role,
    collision: BubbleCollision,
    distance: number,
    contactPosition: BubbleVector
  ): void {
    playerMoveTarget.value = null;
    const bubblePosition = bubblePositionAt(collision.bubble, distance);
    capturedBubbleId.value = collision.bubble.id;
    capturedRole.value = role;
    capturedBubblePosition.value = bubblePosition;
    updatePartyPosition(role, contactPosition);
    die(`${role} 碰觸泡泡`);
    if (captureAnimationFrame !== null) cancelAnimationFrame(captureAnimationFrame);
    captureAnimationFrame = requestAnimationFrame(() => {
      updatePartyPosition(role, bubblePosition);
      captureAnimationFrame = null;
    });
  }

  function processTimeline(previousSeconds: number, nextSeconds: number): void {
    for (const event of timelineEventsBetween(previousSeconds, nextSeconds)) {
      if (event.type === 'ground-aoe-spawn') {
        const sourceRoles = event.schedule.cycle === 1 ? ROLES : [playerRole.value];
        groundAoes.value.push(...groundAoeSnapshotsForRoles(
          event.schedule,
          partyPositions.value,
          sourceRoles
        ));
        continue;
      }
      if (event.type === 'ground-aoe-explode') {
        const explodingAoes = groundAoes.value.filter(item => (
          item.cycle === event.schedule.cycle && item.round === event.schedule.round
        ));
        const playerHit = explodingAoes.find(aoe => circlesTouch(
          aoe.position,
          GROUND_AOE_DIAMETER_TILES / 2,
          playerPosition.value,
          PLAYER_RADIUS_TILES
        ));
        if (playerHit && !dead.value) {
          die(`第 ${playerHit.cycle} 次水化爆彈・第 ${playerHit.round} 輪黃色 AOE`);
        }
        if (event.schedule.cycle === 1) {
          for (const npc of npcMembers.value) {
            const hit = explodingAoes.find(aoe => circlesTouch(
              aoe.position,
              GROUND_AOE_DIAMETER_TILES / 2,
              npc.position,
              PLAYER_RADIUS_TILES
            ));
            if (hit) {
              reportNpcHazard(
                npc.role,
                'ground-aoe',
                hit.id,
                event.schedule.explodeAtSeconds,
                `${npc.role} 在第 ${event.schedule.round} 輪爆炸時仍位於 ${hit.sourceRole} 的黃圈內。`
              );
              if (hit.sourceRole === playerRole.value && !dead.value) {
                die(`${npc.role} 被玩家引導的第 ${event.schedule.round} 輪黃色 AOE 命中`);
              }
            }
          }
        }
        continue;
      }
      if (event.resolution.slot === 'first') {
        if (dead.value) {
          playing.value = false;
          continue;
        }
        const mechanicKind = mechanicKindForSlot(mechanicOrder.value, 'first');
        const result = resolvePartyMechanic(
          mechanicKind,
          partyPositions.value,
          PLAYER_RADIUS_TILES
        );
        if (!result.success) {
          die(`第一次${mechanicKind === 'stack' ? '分攤' : '分散'}判定失敗：${result.message}`);
          playing.value = false;
        } else {
          firstResolutionSucceeded.value = true;
        }
      } else {
        if (dead.value) {
          playing.value = false;
          continue;
        }
        const mechanicKind = mechanicKindForSlot(mechanicOrder.value, 'second');
        const result = resolvePartyMechanic(
          mechanicKind,
          partyPositions.value,
          PLAYER_RADIUS_TILES
        );
        if (!result.success) {
          die(`第二次${mechanicKind === 'stack' ? '分攤' : '分散'}判定失敗：${result.message}`);
          playing.value = false;
        } else {
          secondResolutionSucceeded.value = true;
        }
      }
      resolutionPositions.value = {
        ...resolutionPositions.value,
        [event.resolution.slot]: { ...playerPosition.value }
      };
    }
  }

  function tick(timestamp: number): void {
    if (!playing.value) return;
    if (previousTimestamp !== null) {
      const deltaSeconds = Math.max(0, (timestamp - previousTimestamp) / 1000);
      const previousEncounterSeconds = encounterElapsedSeconds.value;
      const nextEncounterSeconds = previousEncounterSeconds + deltaSeconds;
      encounterElapsedSeconds.value = nextEncounterSeconds;

      const movementSeconds = Math.max(
        0,
        nextEncounterSeconds - Math.max(previousEncounterSeconds, BUBBLES_MOVE_AT_SECONDS)
      );
      const previousDistance = distanceTiles.value;
      const nextDistance = previousDistance + movementSeconds * speed.value;
      const playerStart = playerPosition.value;
      const playerEnd = !dead.value && playerMoveTarget.value
        ? movePartyMemberToward(
            playerStart,
            playerMoveTarget.value,
            deltaSeconds,
            PARTY_MOVE_SPEED_TILES_PER_SECOND
          )
        : playerStart;
      const collision = !dead.value && nextEncounterSeconds >= BUBBLES_SPAWN_AT_SECONDS
        ? bubbleCollisionTime(
            previousDistance,
            nextDistance,
            playerStart,
            playerEnd
          )
        : null;
      if (collision !== null) {
        const collisionDistance = previousDistance
          + (nextDistance - previousDistance) * collision.time;
        distanceTiles.value = collisionDistance;
        captureActor(
          playerRole.value,
          collision,
          collisionDistance,
          interpolatePosition(playerStart, playerEnd, collision.time)
        );
      } else {
        distanceTiles.value = nextDistance;
        if (!dead.value) updatePartyPosition(playerRole.value, playerEnd);
      }
      updateNpcPositions(
        previousEncounterSeconds,
        nextEncounterSeconds,
        previousDistance,
        distanceTiles.value
      );
      processTimeline(previousEncounterSeconds, nextEncounterSeconds);
    }
    previousTimestamp = timestamp;
    if (!playing.value) {
      animationFrame = null;
      return;
    }
    if (finished.value) {
      playing.value = false;
      animationFrame = null;
      return;
    }
    animationFrame = requestAnimationFrame(tick);
  }

  function beginFrameLoop(): void {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    previousTimestamp = null;
    animationFrame = requestAnimationFrame(tick);
  }

  function togglePlayback(): void {
    if (dead.value || finished.value) {
      restart();
      return;
    }
    playing.value = !playing.value;
    if (playing.value) beginFrameLoop();
    else if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  function restart(): void {
    configuration.value = configurationMode.value === 'random'
      ? randomBubbleConfiguration()
      : BUBBLE_CONFIGURATIONS[configurationMode.value];
    mechanicOrder.value = randomMechanicOrder();
    selectedMechanicOrder.value = null;
    npcFirstMoveStartedAtSeconds.value = null;
    firstResolutionSucceeded.value = false;
    secondResolutionSucceeded.value = false;
    orderFeedback.value = null;
    incorrectOrderAttempts.value = 0;
    orderPenaltyActive.value = false;
    forcedCorrectOrder.value = null;
    if (orderPenaltyTimer !== null) window.clearTimeout(orderPenaltyTimer);
    orderPenaltyTimer = null;
    distanceTiles.value = 0;
    partyPositions.value = initialBubblePartyPositions();
    playerMoveTarget.value = null;
    dead.value = false;
    deathCause.value = null;
    capturedBubbleId.value = null;
    capturedRole.value = null;
    capturedBubblePosition.value = null;
    encounterElapsedSeconds.value = 0;
    groundAoes.value = [];
    npcDebugAlerts.value = [];
    reportedNpcHazards.clear();
    resolutionPositions.value = {};
    if (captureAnimationFrame !== null) cancelAnimationFrame(captureAnimationFrame);
    captureAnimationFrame = null;
    playing.value = true;
    beginFrameLoop();
  }

  function setSpeed(value: number): void {
    speed.value = value;
  }

  function setConfigurationMode(mode: BubbleConfigurationMode): void {
    configurationMode.value = mode;
    restart();
  }

  function chooseMechanicOrder(choice: MechanicOrder): void {
    if (selectedMechanicOrder.value !== null || orderPenaltyActive.value) return;
    if (choice === mechanicOrder.value) {
      selectedMechanicOrder.value = choice;
      orderFeedback.value = 'correct';
      npcFirstMoveStartedAtSeconds.value = encounterElapsedSeconds.value;
      return;
    }
    incorrectOrderAttempts.value += 1;
    orderFeedback.value = 'incorrect';
    if (incorrectOrderAttempts.value >= 2) {
      orderPenaltyActive.value = true;
      if (orderPenaltyTimer !== null) window.clearTimeout(orderPenaltyTimer);
      orderPenaltyTimer = window.setTimeout(() => {
        forcedCorrectOrder.value = mechanicOrder.value;
        orderPenaltyActive.value = false;
        orderPenaltyTimer = null;
      }, 1500);
    }
  }

  function selectPlayerRole(role: Role): void {
    if (dead.value) return;
    playerMoveTarget.value = null;
    playerRole.value = role;
  }

  function setPlayerPosition(position: BubbleVector): void {
    if (dead.value) return;
    playerMoveTarget.value = clampPlayerPosition(position);
  }

  function setPlayerDragging(dragging: boolean): void {
    if (dead.value || !dragging) playerMoveTarget.value = null;
  }

  beginFrameLoop();
  onScopeDispose(() => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    if (captureAnimationFrame !== null) cancelAnimationFrame(captureAnimationFrame);
    if (orderPenaltyTimer !== null) window.clearTimeout(orderPenaltyTimer);
  });

  return {
    configurationMode, configuration, bubbles, bubblesSpawned,
    playerRole, partyPositions, partyMembers, npcMembers, playerPosition,
    speed, playing, finished, dead, deathCause, capturedBubbleId, capturedRole,
    encounterElapsedSeconds, groundAoes: activeGroundAoes, spreadPreview, stackPreview,
    startDelayRemainingSeconds, waitingToMove,
    mechanicOrder, selectedMechanicOrder, npcFirstMoveStartedAtSeconds,
    firstResolutionSucceeded, secondResolutionSucceeded,
    orderFeedback, incorrectOrderAttempts,
    orderPenaltyActive, forcedCorrectOrder, visibleDebuffs, npcDebugAlerts,
    togglePlayback, restart, setSpeed, setConfigurationMode, chooseMechanicOrder,
    setPlayerPosition, setPlayerDragging, selectPlayerRole
  };
}
