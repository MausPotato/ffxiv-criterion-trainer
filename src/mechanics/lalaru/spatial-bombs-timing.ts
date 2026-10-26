export const SPATIAL_BOMBS_TIMING = {
  // Keep the arena clear before revealing the complete route fixture.
  revealDelayMs: 1_000,
  // Give the player a readable pattern-preview beat before step one.
  previewDurationMs: 3_000,
  firstStepOffsetMs: 0,
  stepIntervalMs: 1_000,
  explosionDurationMs: 560,
  npcMoveDurationMs: 650,
  // Adjustable footage-calibration seam between the final bombs and rotation cue.
  cannonAfterFinalBombDelayMs: 650,
  cannonCountdownMs: 5_000,
  cannonCountdownStepMs: 1_000,
  cannonImpactMs: 650
} as const;
