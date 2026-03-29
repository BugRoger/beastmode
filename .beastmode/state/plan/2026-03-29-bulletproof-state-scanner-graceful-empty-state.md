# graceful-empty-state

**Design:** `.beastmode/state/design/2026-03-29-bulletproof-state-scanner.md`
**Architectural Decisions:** see manifest

## User Stories

5. As a pipeline operator, I want the scanner to handle missing or empty pipeline directories gracefully, so that first-boot and clean-state scenarios don't crash.

## What to Build

Ensure the scanner handles these edge cases without throwing:
- Pipeline directory does not exist (first boot before any `beastmode watch` run)
- Pipeline directory exists but is empty (all epics released and cleaned up)
- Manifest file exists but has no `phase` field (pre-migration manifest)
- Manifest file exists but is empty or contains only whitespace

For missing directories, return an empty array. For missing `phase` field, fall back to inferring phase from the manifest structure (features present → at least `plan`, all completed → `validate`). For empty/corrupt files, skip with a warning.

The scanner should never throw an unhandled exception during the watch loop — errors skip the current tick and retry on the next poll interval.

## Acceptance Criteria

- [ ] Missing pipeline directory returns empty array, no throw
- [ ] Empty pipeline directory returns empty array, no throw
- [ ] Manifest without `phase` field falls back to structural inference
- [ ] Empty or whitespace-only manifest files are skipped with a warning
- [ ] Scanner errors in the watch loop skip the tick, no crash
- [ ] First-boot scenario (no `.beastmode/pipeline/`) works cleanly
