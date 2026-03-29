# scanner-overhaul

**Design:** .beastmode/state/design/2026-03-29-status-unfuckery-v2.md

## User Stories

1. As a user running `beastmode status`, I want to see only epics with valid pipeline manifests, so that the output shows real active work instead of 118 historical zombies.
2. As a user, I want the phase shown in status to match what the pipeline reconciler wrote to the manifest, so that the scanner and orchestrator agree on reality.
5. As a user, I want blocked epics to show clear instructions (`run beastmode <phase> <slug>`), so I know exactly what to do when a phase has human gates.

## What to Build

Rewrite the scanner's epic discovery to use pipeline manifest directory as the sole source. Remove all design-file-based discovery (the glob over `state/design/*.md`). Each valid manifest in `pipeline/` becomes one epic in the scan results.

Replace the `derivePhase` heuristic waterfall with a direct read of `manifest.phase`. If the field is missing or contains an invalid value, the manifest is rejected (skipped entirely). Remove `derivePhase`, `hasPhaseMarker`, `hasLegacyArtifact`, and all output.json waterfall logic.

Simplify blocked detection: a single boolean derived from whether the current phase has any `human` gates in config. When blocked, the scanner populates enough info for the status command to render `run beastmode <phase> <slug>`.

The scanner remains pure read-only. It uses the shared validation schema from the manifest-schema feature to validate manifests.

## Acceptance Criteria

- [ ] Scanner discovers epics from pipeline/ manifests only — no design file glob
- [ ] Phase comes from `manifest.phase` directly — no heuristic derivation
- [ ] Manifests without valid `phase` are skipped entirely
- [ ] `derivePhase`, `hasPhaseMarker`, `hasLegacyArtifact`, output.json waterfall removed
- [ ] Blocked is a single boolean derived from config gate modes
- [ ] Scanner uses shared validation schema for manifest reads
- [ ] Zero zombie epics appear when only valid manifests exist
