# Output JSON Phase Detection

**Design:** .beastmode/state/design/2026-03-29-status-unfuckery.md

## User Stories

1. As a user running `beastmode status`, I want to see only epics with valid pipeline state, so that the output reflects reality instead of showing ghost epics with wrong phases.
3. As a user who has shipped epics through the full pipeline, I want phase detection based on output.json checkpoint files, so that completed phases are accurately tracked.
6. As a developer, I want the state scanner tests to validate the new behavior (structural validation, output.json phase detection, malformed manifest skipping), so that regressions are caught.

## What to Build

Rewrite the state scanner's `derivePhase` function to use output.json checkpoint files as the sole source of truth for phase detection. The scanner checks for existence of `state/<phase>/YYYY-MM-DD-<slug>.output.json` files per phase and applies a waterfall: release output.json present means release phase (done), validate output.json means validate, all features completed means implement-done, pending features means implement, manifest exists means plan, otherwise design.

Remove the `MANIFEST_EPOCH` date constant and all branching logic that uses it. Remove the `hasPhaseMarker` helper function that checks pipeline directory markers. Remove the `hasLegacyArtifact` helper function that checks legacy state directory files. These three removal targets eliminate all the heuristic-based phase detection.

The manifest source should be restricted to the pipeline directory only — the scanner should no longer fall back to reading from `state/plan/` for manifests.

Update all existing state-scanner tests to use output.json fixtures instead of legacy state directory artifacts. Remove the test for pre-MANIFEST_EPOCH date handling. Add new tests: output.json in state/release/ causes release phase, output.json in state/validate/ with no release output.json causes validate phase.

## Acceptance Criteria

- [ ] `derivePhase` uses output.json waterfall logic exclusively
- [ ] `MANIFEST_EPOCH` constant is removed
- [ ] `hasPhaseMarker` function is removed
- [ ] `hasLegacyArtifact` function is removed
- [ ] Manifest lookup only checks pipeline directory, not state/plan/
- [ ] Epics without output.json files fall through to design phase correctly
- [ ] Test: output.json in state/release/ → epic shows as release phase
- [ ] Test: output.json in state/validate/ (no release) → epic shows as validate phase
- [ ] Test: pre-MANIFEST_EPOCH test removed
- [ ] All existing tests updated to use output.json fixtures
- [ ] Clean-slate behavior: pre-existing epics without output.json are not visible or show as design
