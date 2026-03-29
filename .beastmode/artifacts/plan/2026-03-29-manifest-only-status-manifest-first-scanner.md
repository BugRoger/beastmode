# Manifest-First Scanner

**Design:** .beastmode/state/design/2026-03-29-manifest-only-status.md
**Architectural Decisions:** see manifest

## User Stories

1. As a user running `beastmode status`, I see only active epics (those with manifests) so the table is actionable instead of 100+ rows of noise
3. As a maintainer, the scanner has no dead code paths (MANIFEST_EPOCH, marker files, legacy artifact checks, run log parsing for cost) so the codebase stays lean

## What to Build

Rewrite `scanEpics()` in state-scanner.ts to pivot discovery on manifest files instead of design files. Scan both `pipeline/` and `state/plan/` directories for `*.manifest.json` files, dedup by slug with pipeline taking precedence. Extract slugs from manifest filenames using the same date-prefix stripping pattern.

Replace `derivePhase()` to use the `manifest.phases` map instead of marker files and legacy state directory artifacts. The phases map has `validate` and `release` as keys with `"completed"` as the value when those phases are done.

Add an optional `phases` field to the internal Manifest interface: `phases?: Record<string, string>`.

Remove dead code: `MANIFEST_EPOCH` constant, `dateFromDesign()`, `hasPhaseMarker()`, `hasLegacyArtifact()`, `readRunLog()`, `aggregateCost()`. Remove `costUsd` from `EpicState` interface. Make `designPath` optional on `EpicState` — resolve it from the manifest's `design` field if available. Add `lastUpdated` to `EpicState` from the manifest's `lastUpdated` field.

Update `deriveNextAction()` to never return a "design" action — manifest-only discovery means design-only epics are invisible.

Update the existing test suite to reflect manifest-first discovery: tests should create manifests directly (not just design files), remove tests that depend on design-file-only discovery or MANIFEST_EPOCH behavior, and add new tests for pipeline-vs-plan dedup and manifest.phases-based phase derivation.

## Acceptance Criteria

- [ ] scanEpics() discovers epics from manifest files, not design files
- [ ] Pipeline manifests take precedence over plan manifests for same slug
- [ ] Phase derivation uses manifest.phases map (no marker files)
- [ ] MANIFEST_EPOCH, hasPhaseMarker, hasLegacyArtifact, dateFromDesign removed
- [ ] readRunLog and aggregateCost removed from state-scanner.ts
- [ ] costUsd removed from EpicState
- [ ] lastUpdated added to EpicState
- [ ] All existing tests updated, new tests for dedup and phases-based derivation
- [ ] `bun test` passes
