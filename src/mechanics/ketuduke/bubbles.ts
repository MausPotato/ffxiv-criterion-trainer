export type BubbleConfigurationId = 'A' | 'B';
export type BubbleSide = 'top' | 'right' | 'bottom' | 'left';

export interface BubbleVector {
  x: number;
  y: number;
}

export interface BubbleDefinition extends BubbleVector {
  id: string;
  side: BubbleSide;
  group: 1 | 2;
  direction: BubbleVector;
}

export interface BubbleConfiguration {
  id: BubbleConfigurationId;
  bubbles: readonly BubbleDefinition[];
}

// All measurements use one floor tile as one unit. These values are intentionally
// centralized because the exact in-game spacing and travel speed still need video calibration.
export const BUBBLE_FIELD_SIZE = 4;
export const BUBBLE_RADIUS_TILES = 0.25;
export const BUBBLE_START_DELAY_SECONDS = 3;
export const BUBBLE_DEFAULT_SPEED_TILES_PER_SECOND = 1 / 3;
export const BUBBLE_MIN_SPEED_TILES_PER_SECOND = 0.2;
export const BUBBLE_MAX_SPEED_TILES_PER_SECOND = 1.5;

// The in-game ground marker sits on the arena boundary; the sphere therefore
// straddles the line by one radius instead of sitting fully outside it.
const EDGE_CENTER_OFFSET = 0;

function sideBubbles(
  side: BubbleSide,
  lanes: readonly [number, number, number, number]
): BubbleDefinition[] {
  const directionBySide: Record<BubbleSide, BubbleVector> = {
    top: { x: 0, y: 1 },
    right: { x: -1, y: 0 },
    bottom: { x: 0, y: -1 },
    left: { x: 1, y: 0 }
  };

  return lanes.map((lane, index) => {
    const coordinates: Record<BubbleSide, BubbleVector> = {
      top: { x: lane, y: EDGE_CENTER_OFFSET },
      right: { x: BUBBLE_FIELD_SIZE - EDGE_CENTER_OFFSET, y: lane },
      bottom: { x: lane, y: BUBBLE_FIELD_SIZE - EDGE_CENTER_OFFSET },
      left: { x: EDGE_CENTER_OFFSET, y: lane }
    };
    return {
      id: `${side}-${index + 1}`,
      side,
      group: index < 2 ? 1 : 2,
      ...coordinates[side],
      direction: directionBySide[side]
    };
  });
}

function createConfiguration(id: BubbleConfigurationId, reverse: boolean): BubbleConfiguration {
  const earlyLanes = [0.25, 0.75, 2.25, 2.75] as const;
  const lateLanes = [1.25, 1.75, 3.25, 3.75] as const;
  const leadingLanes = reverse ? earlyLanes : lateLanes;
  const trailingLanes = reverse ? lateLanes : earlyLanes;
  return {
    id,
    bubbles: [
      ...sideBubbles('top', leadingLanes),
      ...sideBubbles('right', leadingLanes),
      ...sideBubbles('bottom', trailingLanes),
      ...sideBubbles('left', trailingLanes)
    ]
  };
}

// A follows the supplied screenshot. B reverses the stagger as one complete layout:
// top/right and bottom/left exchange lane sets. Travel remains the provisional
// straight-inward interpretation until gameplay footage confirms direction/timing.
export const BUBBLE_CONFIGURATIONS: Readonly<Record<BubbleConfigurationId, BubbleConfiguration>> = {
  A: createConfiguration('A', false),
  B: createConfiguration('B', true)
};

export function randomBubbleConfiguration(random: () => number = Math.random): BubbleConfiguration {
  return random() < 0.5 ? BUBBLE_CONFIGURATIONS.A : BUBBLE_CONFIGURATIONS.B;
}

export function bubblePositionAt(
  bubble: BubbleDefinition,
  distanceTiles: number
): BubbleVector {
  return {
    x: bubble.x + bubble.direction.x * distanceTiles,
    y: bubble.y + bubble.direction.y * distanceTiles
  };
}

export function isBubbleVisible(position: BubbleVector): boolean {
  return position.x >= -BUBBLE_RADIUS_TILES
    && position.x <= BUBBLE_FIELD_SIZE + BUBBLE_RADIUS_TILES
    && position.y >= -BUBBLE_RADIUS_TILES
    && position.y <= BUBBLE_FIELD_SIZE + BUBBLE_RADIUS_TILES;
}
