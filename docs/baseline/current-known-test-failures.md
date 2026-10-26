# Current known test failures

Baseline recorded on 2026-10-27 before the TrainerPageShell migration.

Command:

```text
npm.cmd test
```

The suite reported 315 tests: 313 passed and 2 failed. Both failures predate the
page-shell refactor and belong to the Ketuduke blowing-bubbles simulation:

1. `spread-first second-stage routes form the fixed left and right pairs`
   (`tests/unit/ketuduke-bubble-party.test.mjs:170`)
   - Expected T to route to `{ x: 1.3, y: 2 }`.
   - Actual route was `{ x: 0.18, y: 2.35 }`.
2. `both mechanic orders resolve at T+26 for every player role and bubble configuration`
   (`tests/unit/ketuduke-bubble-preview.test.mjs:115`)
   - The `spread-first/A/T` fixture fails the second stack settlement because H and D2 do not meet.

These failures are outside the TrainerPageShell scope. During the first shell migration,
the expected baseline is that no additional tests fail.
