## Problem Statement

`beastmode status` is fundamentally broken despite the v0.35.0 (status-unfuckery v1) fixes. A comprehensive audit found 20 bugs across the state scanner, status command, and watch command. Critical issues include: the `lastUpdated` field was removed from EpicState but the status command still reads it (Last Activity column always shows "-"), two competing EpicState type definitions silently diverge between state-scanner.ts and watch-types.ts, and the scanner ignores the manifest's own `phase` field and re-derives phase from heuristics that disagree with the reconciler. Additionally, the scanner discovers 120 epics via state/design/*.md files (118 of which are historical junk), blocked/gateBlocked are always identical, gate checks fire meaninglessly on zombie epics, GatesConfig is missing the validate phase, and the reconciler writes a `phases` map the scanner ignores.

## Solution

Full overhaul of the state scanner, status command, and supporting infrastructure. Pipeline manifests become the sole source of epic discovery (eliminating 118 zombie epics). The manifest's `phase` field becomes the authoritative phase source (eliminating heuristic disagreement). A shared validation schema enforces manifest structure for both reading (scanner) and writing (reconciler). The duplicate EpicState type in watch-types.ts is deleted in favor of the single canonical type in state-scanner.ts. The status command gets a redesigned compact table output with a `--verbose` flag for diagnostic visibility into skipped manifests. Cost tracking is removed. The blocked field is unified to mean "has human gates, must run interactively."

## User Stories

1. As a user running `beastmode status`, I want to see only epics with valid pipeline manifests, so that the output shows real active work instead of 118 historical zombies.
2. As a user, I want the phase shown in status to match what the pipeline reconciler wrote to the manifest, so that the scanner and orchestrator agree on reality.
3. As a user, I want a compact status table (Epic | Phase | Features | Status) with color-coded output, so I can quickly see pipeline state at a glance.
4. As a user with a malformed manifest, I want strict validation that rejects it silently (visible only with `--verbose`), so that bad data never corrupts the status display.
5. As a user, I want blocked epics to show clear instructions (`run beastmode <phase> <slug>`), so I know exactly what to do when a phase has human gates.
6. As a developer, I want a single EpicState type, shared manifest schema, and consistent flat-file path convention, so that the scanner, status command, watch command, and manifest.ts all operate on the same data model.

## Implementation Decisions

- Epic discovery uses pipeline/ directory manifests only. Remove all design-file-based discovery from the scanner
- Phase derivation reads `manifest.phase` directly. Strict reject if `phase` field is missing or invalid — manifest is skipped entirely
- New shared manifest validation schema (Zod-style or plain TypeScript validator) used by both scanner (read) and reconciler (write). Required fields: `phase` (valid Phase literal), `design` (string), `features` (array of objects with `slug: string` and `status: string`), `lastUpdated` (string)
- Single `EpicState` interface in state-scanner.ts. Delete watch-types.ts entirely. Watch command imports types from state-scanner
- Collapse `blocked` + `gateBlocked` + `blockedGate` + `gateName` into a single `blocked: boolean` field. When true, status output shows: `blocked: run beastmode <phase> <slug>`
- Add `validate` phase to GatesConfig type in config.ts
- Fix manifest.ts to use flat file paths (`pipeline/YYYY-MM-DD-<slug>.manifest.json`) matching the scanner convention. Delete directory-per-slug code
- Fix watch.ts WatchDeps interface to match what watch-command.ts passes
- Remove cost aggregation from scanner and status output (remove `costUsd`, `aggregateCost`, `readRunLog`)
- Remove `derivePhase` heuristic function, output.json waterfall logic, `hasPhaseMarker`, `hasLegacyArtifact`
- Status command redesigned as compact table: Epic | Phase | Features (done/total) | Status. One line per epic
- Add `--verbose` flag to status command that shows skipped/malformed manifests and validation errors
- Feature status validation: validate that `f.status` is one of the expected values (`pending`, `in-progress`, `completed`, `blocked`) instead of casting any string
- Fix `statusCommand` to use `findProjectRoot()` instead of `process.cwd()` so it works from subdirectories
- Reconciler in watch-command.ts uses shared manifest schema for writes

## Testing Decisions

- Rewrite state-scanner.test.ts for new behavior: pipeline-only discovery, manifest.phase authority, strict validation
- Add test: manifest without `phase` field is skipped (strict reject)
- Add test: manifest with invalid `phase` value is skipped
- Add test: only pipeline/ manifests appear in scan results (no design file discovery)
- Add test: single `blocked` field reflects human gate config for current phase
- Add test: validate phase gate blocking works (GatesConfig coverage)
- Add test: feature status validation rejects unknown values
- Add test: --verbose flag surfaces skipped manifest details
- Add tests for status.ts formatters: `formatBlocked`, `formatProgress`, `buildStatusRows`, `formatTable`
- Add test: manifest.ts flat-file path convention matches scanner
- Add test: shared schema validates both read (scanner) and write (reconciler) paths
- Remove tests for: design-file discovery, output.json waterfall, derivePhase heuristics, cost aggregation, MANIFEST_EPOCH
- Prior art: existing test patterns (beforeEach/afterEach setup, TEST_ROOT temp dir, fs mocking) are appropriate

## Out of Scope

- Redesigning the watch loop architecture beyond fixing the WatchDeps interface
- Adding feature-level detail or drill-down to status output
- Adding filtering, sorting, or interactive features to status output
- Fixing the reconciler's manifest writing logic beyond adopting the shared schema
- Adding output.json writing to phase checkpoint skills that don't have it yet
- Signal-to-noise improvements like hiding completed/released epics
- Cost tracking redesign (removed entirely, could come back as a separate feature)
- Migrating existing pipeline manifests to add missing `phase` fields (they'll be skipped until reconciler updates them)

## Further Notes

The existing pipeline manifests (`bulletproof-state-scanner.manifest.json` and `interactive-cmux-workspaces.manifest.json`) may not have top-level `phase` fields in the correct format. After this overhaul, they will be skipped by the scanner until the reconciler next updates them (which adds the `phase` field). This is intentional — it's better to show nothing than to show lies.

The watch-command reconciler already writes `phases` map to manifests, but this is a different format than the top-level `phase` string. The shared schema should standardize on the top-level `phase` field. The reconciler will need to write `phase` instead of (or in addition to) the `phases` map.

## Deferred Ideas

- Add a `beastmode gc` command to clean up stale pipeline manifests, orphaned worktrees, and historical state/design/ files
- Restore cost tracking as a separate `beastmode costs` command that reads .beastmode-runs.json independently
- Add a `--json` flag to status command for machine-readable output
- Add a `beastmode status <slug>` drill-down mode for feature-level detail on a single epic
