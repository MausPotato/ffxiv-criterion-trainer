export type ArrowSide = 'left' | 'right';
export type Multiplier = 'III' | 'V';
export type SelectedSide = 'left' | 'right';
export type RingTurnDirection = 'clockwise' | 'counterclockwise';
export type CardinalDirection = 'north' | 'east' | 'south' | 'west';

export interface ArenaPoint {
  x: number;
  y: number;
}

export interface LalaRuQuestion {
  initialSafeDirection: CardinalDirection;
  arrowSide: ArrowSide;
  multiplier: Multiplier;
  dotPattern: 3 | 5;
}

export interface RotationMultiplicationCue {
  arrowSide: ArrowSide;
  multiplier: Multiplier;
  dotPattern: 3 | 5;
}

export type LalaRuPhase = 'idle' | 'casting' | 'resolved';
export type LalaRuMode = 'tutorial' | 'battle';
