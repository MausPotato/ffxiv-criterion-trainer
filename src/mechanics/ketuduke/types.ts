import type { CellIndex, GridCoordinate, Quadrant } from '../../domain/grid.ts';
import type { PartialRoleMap, Role, RoleMap } from '../../domain/roles.ts';

export type CrystalOrientation = 'h' | 'v';
export type Buff = 'bubble' | 'bind';
export type PartyMechanic = '分攤' | '分散';
export type Rotation = 'cw' | 'ccw';
export type MahjongRegion = 1 | 2;
export type WindStep = 1 | 2;
export type TrainerPhase = 0 | 1 | 2;

export interface Crystal extends GridCoordinate {
  o: CrystalOrientation;
  q: Quadrant;
}

export interface CenterCrystal extends GridCoordinate {
  o: CrystalOrientation;
}

export interface KetudukeQuestion {
  center: CenterCrystal;
  crystals: Crystal[];
  buffs: RoleMap<Buff>;
  party: PartyMechanic;
  rotation: Rotation;
}

export type PlayerPositions = PartialRoleMap<CellIndex>;
export type CompletePlayerPositions = RoleMap<CellIndex>;

export interface PartySolution {
  pre: CompletePlayerPositions;
  final: CompletePlayerPositions;
}

export interface CrystalMotionPlan {
  middle: Crystal[];
  target: Crystal[];
}

export interface TrainerMechanicState {
  ready: boolean;
  phase: TrainerPhase;
  focus: Role | null;
  queue: PlayerPositions;
  pre: PlayerPositions;
  playerFinal: PlayerPositions;
  crystalFinal: Crystal[];
  mahVisible: boolean;
  hasChecked: boolean;
  lockPosition: boolean;
  review: boolean;
}
