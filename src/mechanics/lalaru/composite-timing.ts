import { LALARU_TIMING } from './timing.ts';

export const COMPOSITE_TIMING = {
  // Analysis is granted before the composite-pattern arrows appear at T0.
  // This lead-in is provisional until the combat footage is measured.
  analysisLeadInMs: 1_000,
  previewDurationMs: 3_000,
  firstActivationOffsetMs: 0,
  stepIntervalMs: 1_000,
  activePulseMs: 650,
  orbExplosionMs: 700,
  // Show the cannon only after the first orb's explosion animation finishes.
  bossCannonAfterFirstOrbDelayMs: 700,
  // The first orb starts the existing first-mechanic cast; this is not tied to a fixed route index.
  bossCannonResolveMs: LALARU_TIMING.resolveMs,
  bossCannonImpactMs: 650,
  playerRotationCueDelayMs: 0,
  playerRotationDotFirstChangeMs: 1_000,
  playerRotationDotStepMs: 1_000,
  playerRotationResolveMs: 5_200,
  highPrecisionDelayMs: 650,
  highPrecisionImpactMs: 700
} as const;
