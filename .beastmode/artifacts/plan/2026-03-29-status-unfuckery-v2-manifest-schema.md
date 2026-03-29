# manifest-schema

**Design:** .beastmode/state/design/2026-03-29-status-unfuckery-v2.md

## User Stories

4. As a user with a malformed manifest, I want strict validation that rejects it silently (visible only with `--verbose`), so that bad data never corrupts the status display.
6. As a developer, I want a single EpicState type, shared manifest schema, and consistent flat-file path convention, so that the scanner, status command, watch command, and manifest.ts all operate on the same data model.

## What to Build

A shared manifest validation module that enforces structure for both reading (scanner) and writing (reconciler). The validator requires: `phase` (valid Phase literal), `design` (string), `features` (array of objects with `slug: string` and `status: string` from an allowed set), `lastUpdated` (string). Feature status values are constrained to `pending | in-progress | completed | blocked`.

Delete the duplicate `EpicState` interface in watch-types.ts. The canonical `EpicState` lives in state-scanner.ts. Watch command and watch loop import from there. Collapse `blocked`, `gateBlocked`, `blockedGate`, and `gateName` into a single `blocked: boolean` field on EpicState.

Add `validate` to the `GatesConfig` type in config.ts so gate blocking works for all five phases.

Unify manifest path convention: flat files at `pipeline/YYYY-MM-DD-<slug>.manifest.json` matching the scanner's existing lookup pattern. Remove directory-per-slug code from manifest.ts.

Remove cost tracking: delete `costUsd` from EpicState, remove `aggregateCost` and `readRunLog` functions from the scanner.

## Acceptance Criteria

- [ ] Shared validation function exists and is imported by both scanner and reconciler
- [ ] Validation rejects manifests missing `phase` or with invalid phase values
- [ ] Validation rejects features with unknown status values
- [ ] watch-types.ts EpicState duplicate is deleted; watch.ts imports from state-scanner
- [ ] EpicState has single `blocked: boolean` — no `gateBlocked`, `blockedGate`, `gateName`
- [ ] GatesConfig includes `validate` phase
- [ ] manifest.ts uses flat-file path convention matching scanner
- [ ] costUsd, aggregateCost, readRunLog removed from scanner
