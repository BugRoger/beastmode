# canonical-scanner-rewrite

**Design:** `.beastmode/state/design/2026-03-29-bulletproof-state-scanner.md`
**Architectural Decisions:** see manifest

## User Stories

3. As a pipeline operator, I want a single canonical scanner implementation, so that the watch loop and status command always agree about epic state.

## What to Build

Rewrite `state-scanner.ts` to be the single canonical scanner. The rewritten scanner reads `manifest.phase` directly instead of deriving phase from marker files and feature status heuristics. The `derivePhase()` function is replaced with a direct read of the `phase` field.

Remove `scanEpicsInline()` from `watch-command.ts` entirely. Remove the try/catch dynamic import fallback that currently catches import failures and falls back to the inline scanner. Replace with a direct import of `state-scanner.ts`.

Remove `costUsd` from the `EpicState` interface and all cost aggregation logic from the scanner — this is a separate concern handled by `beastmode status`.

Simplify `deriveNextAction()` to use `manifest.phase` as the primary dispatch signal. Remove the gate-checking logic that preemptively reads config to determine if a phase is human-gated — the watch loop handles that separately.

## Acceptance Criteria

- [ ] `state-scanner.ts` reads `manifest.phase` directly for phase determination
- [ ] `scanEpicsInline()` is removed from `watch-command.ts`
- [ ] Dynamic import fallback (try/catch) is removed — scanner is imported directly
- [ ] `costUsd` removed from `EpicState` interface
- [ ] Cost aggregation functions removed from scanner
- [ ] `deriveNextAction()` uses `manifest.phase` as primary dispatch signal
- [ ] Preemptive gate config checking removed from scanner
- [ ] Watch loop and status command use the same scanner entry point
