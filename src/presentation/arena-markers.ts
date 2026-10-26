export type ArenaMarkerId = 'A' | 'B' | 'C' | 'D' | '1' | '2' | '3' | '4';
export type ArenaMarkerKind = 'letter' | 'number';

export interface ArenaMarkerDefinition {
  id: ArenaMarkerId;
  kind: ArenaMarkerKind;
  x: number;
  y: number;
}

export const ARENA_MARKERS: readonly ArenaMarkerDefinition[] = [
  { id: 'A', kind: 'letter', x: 2, y: 1 },
  { id: 'B', kind: 'letter', x: 3, y: 2 },
  { id: 'C', kind: 'letter', x: 2, y: 3 },
  { id: 'D', kind: 'letter', x: 1, y: 2 },
  { id: '1', kind: 'number', x: 3.5, y: 0.5 },
  { id: '2', kind: 'number', x: 3.5, y: 3.5 },
  { id: '3', kind: 'number', x: 0.5, y: 3.5 },
  { id: '4', kind: 'number', x: 0.5, y: 0.5 }
];
