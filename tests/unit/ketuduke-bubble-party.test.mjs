import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUBBLE_PARTY_ROLE_LABELS,
  BUBBLE_PARTY_SIDES,
  NPC_FIRST_AOE_ESCAPE_START_SECONDS,
  NPC_FIRST_AOE_ROUTES,
  NPC_SECOND_STAGE_RESOLVE_SECONDS,
  NPC_SECOND_STAGE_ROUTES,
  PARTY_MOVE_SPEED_TILES_PER_SECOND,
  NPC_FIRST_TARGETS,
  bubblePartyMembers,
  initialBubblePartyPositions,
  movePartyMemberToward,
  npcFirstAoeRouteTarget,
  npcFirstStagePositionAt,
  npcSecondStageRouteTarget
} from '../../src/mechanics/ketuduke/bubble-party.ts';

test('bubble party starts slightly separated around arena center', () => {
  const positions = initialBubblePartyPositions();
  assert.deepEqual(positions, {
    T: { x: 2, y: 1.7 },
    H: { x: 2, y: 2.3 },
    D1: { x: 1.7, y: 2 },
    D2: { x: 2.3, y: 2 }
  });
  assert.equal(new Set(Object.values(positions).map(({ x, y }) => `${x},${y}`)).size, 4);
});

test('T and D1 own the left half while H and D2 own the right half', () => {
  assert.deepEqual(BUBBLE_PARTY_SIDES, {
    T: 'left',
    H: 'right',
    D1: 'left',
    D2: 'right'
  });
  assert.equal(BUBBLE_PARTY_ROLE_LABELS.T, 'T');
});

test('switching the controlled role leaves exactly the other three members as NPCs', () => {
  const positions = initialBubblePartyPositions();
  for (const playerRole of ['T', 'H', 'D1', 'D2']) {
    const members = bubblePartyMembers(positions, playerRole, 'spread-first');
    assert.deepEqual(
      members.filter(member => member.controller === 'player').map(member => member.role),
      [playerRole]
    );
    assert.equal(members.filter(member => member.controller === 'npc').length, 3);
    assert.ok(members.every(member => member.mechanicOrder === 'spread-first'));
  }
});

test('fresh initial positions do not share mutable coordinate objects', () => {
  const first = initialBubblePartyPositions();
  const second = initialBubblePartyPositions();
  first.T.x = 0;
  assert.equal(second.T.x, 2);
});

test('stack-first NPC targets overlap T with D1 at 4 and H with D2 at 2', () => {
  assert.deepEqual(NPC_FIRST_TARGETS.stack.T, { x: 0.5, y: 0.5 });
  assert.deepEqual(NPC_FIRST_TARGETS.stack.D1, NPC_FIRST_TARGETS.stack.T);
  assert.deepEqual(NPC_FIRST_TARGETS.stack.H, { x: 3.5, y: 3.5 });
  assert.deepEqual(NPC_FIRST_TARGETS.stack.D2, NPC_FIRST_TARGETS.stack.H);
});

test('spread-first NPC targets use each role central quadrant from the reference diagram', () => {
  assert.deepEqual(NPC_FIRST_TARGETS.spread, {
    T: { x: 1.5, y: 1.5 },
    H: { x: 2.5, y: 2.5 },
    D1: { x: 1.5, y: 2.5 },
    D2: { x: 2.5, y: 1.5 }
  });
});

test('first-stage NPC movement uses the shared party movement speed', () => {
  const moveStartedAtSeconds = 4;
  assert.deepEqual(
    npcFirstStagePositionAt('T', 'stack-first', moveStartedAtSeconds, moveStartedAtSeconds),
    { x: 2, y: 1.7 }
  );
  assert.deepEqual(
    npcFirstStagePositionAt(
      'T',
      'stack-first',
      moveStartedAtSeconds + 5,
      moveStartedAtSeconds
    ),
    { x: 0.5, y: 0.5 }
  );
  assert.deepEqual(
    npcFirstStagePositionAt('T', 'spread-first', 4.5, moveStartedAtSeconds),
    movePartyMemberToward({ x: 2, y: 1.7 }, { x: 1.5, y: 1.5 }, 0.5)
  );
});

test('first-stage NPCs remain at the opening formation until a correct answer unlocks movement', () => {
  assert.deepEqual(
    npcFirstStagePositionAt('D2', 'spread-first', 20, null),
    { x: 2.3, y: 2 }
  );
});

test('first Hydration Bomb routes are centralized for both mechanic orders and bubble layouts', () => {
  for (const mechanic of ['stack', 'spread']) {
    for (const configuration of ['A', 'B']) {
      for (const role of ['T', 'H', 'D1', 'D2']) {
        const route = NPC_FIRST_AOE_ROUTES[mechanic][configuration][role];
        assert.equal(route.length, 4);
        assert.equal(route.at(-1).atSeconds, NPC_FIRST_AOE_ESCAPE_START_SECONDS);
      }
    }
  }
  assert.equal(PARTY_MOVE_SPEED_TILES_PER_SECOND, 0.7);
});

test('spread-first route advances through three bait positions then an A/B-specific escape', () => {
  assert.deepEqual(npcFirstAoeRouteTarget('T', 'spread-first', 'A', 16.9), { x: 1.5, y: 1.5 });
  assert.deepEqual(npcFirstAoeRouteTarget('T', 'spread-first', 'A', 17), { x: 0.5, y: 1.5 });
  assert.deepEqual(npcFirstAoeRouteTarget('T', 'spread-first', 'A', 19), { x: 0.5, y: 0.5 });
  assert.deepEqual(
    npcFirstAoeRouteTarget('T', 'spread-first', 'A', NPC_FIRST_AOE_ESCAPE_START_SECONDS),
    { x: 1.2, y: 0.5 }
  );
  assert.deepEqual(
    npcFirstAoeRouteTarget('T', 'spread-first', 'B', NPC_FIRST_AOE_ESCAPE_START_SECONDS),
    { x: 0.5, y: 1.2 }
  );
});

test('NPC route movement is speed-limited and never teleports to a distant waypoint', () => {
  assert.deepEqual(
    movePartyMemberToward({ x: 0.5, y: 0.5 }, { x: 1.5, y: 0.5 }, 0.5),
    { x: 0.85, y: 0.5 }
  );
  assert.deepEqual(
    movePartyMemberToward({ x: 0.5, y: 0.5 }, { x: 1.5, y: 0.5 }, 3),
    { x: 1.5, y: 0.5 }
  );
});

test('stack-first second-stage routes mirror support movement and keep DPS in their corners', () => {
  assert.deepEqual(
    npcSecondStageRouteTarget('T', 'stack-first', 'A', NPC_SECOND_STAGE_RESOLVE_SECONDS),
    { x: 3.5, y: 0.5 }
  );
  assert.deepEqual(
    npcSecondStageRouteTarget('H', 'stack-first', 'A', NPC_SECOND_STAGE_RESOLVE_SECONDS),
    { x: 0.5, y: 3.5 }
  );
  assert.deepEqual(
    npcSecondStageRouteTarget('T', 'stack-first', 'B', NPC_SECOND_STAGE_RESOLVE_SECONDS),
    { x: 0.5, y: 3.5 }
  );
  assert.deepEqual(
    npcSecondStageRouteTarget('H', 'stack-first', 'B', NPC_SECOND_STAGE_RESOLVE_SECONDS),
    { x: 3.5, y: 0.5 }
  );
  assert.deepEqual(
    npcSecondStageRouteTarget('D1', 'stack-first', 'A', NPC_SECOND_STAGE_RESOLVE_SECONDS),
    { x: 0.5, y: 0.5 }
  );
  assert.deepEqual(
    npcSecondStageRouteTarget('D2', 'stack-first', 'A', NPC_SECOND_STAGE_RESOLVE_SECONDS),
    { x: 3.5, y: 3.5 }
  );
});

test('spread-first second-stage routes form the fixed left and right pairs', () => {
  for (const configuration of ['A', 'B']) {
    assert.deepEqual(
      npcSecondStageRouteTarget('T', 'spread-first', configuration, NPC_SECOND_STAGE_RESOLVE_SECONDS),
      { x: 1.3, y: 2 }
    );
    assert.deepEqual(
      npcSecondStageRouteTarget('D1', 'spread-first', configuration, NPC_SECOND_STAGE_RESOLVE_SECONDS),
      { x: 1.3, y: 2 }
    );
    assert.deepEqual(
      npcSecondStageRouteTarget('H', 'spread-first', configuration, NPC_SECOND_STAGE_RESOLVE_SECONDS),
      { x: 2.7, y: 2 }
    );
    assert.deepEqual(
      npcSecondStageRouteTarget('D2', 'spread-first', configuration, NPC_SECOND_STAGE_RESOLVE_SECONDS),
      { x: 2.7, y: 2 }
    );
  }
  assert.ok(NPC_SECOND_STAGE_ROUTES['spread-first'].A.T.length >= 2);
});
