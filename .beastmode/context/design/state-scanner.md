# State Scanner

## Scanner Architecture
- ALWAYS use state-scanner.ts as the single canonical scanner — no inline scanner, no fallback implementations
- NEVER let the scanner write to the filesystem — scanner is read-only, reconciler is the sole writer
- ALWAYS discover epics by reading manifest files from the pipeline directory only — no design file dependency
- ALWAYS read phase from the top-level `manifest.phase` field — no inference from features, markers, or phases map
- Valid phase values: `plan | implement | validate | release | released`
- ALWAYS use flat-file manifest path convention — `pipeline/YYYY-MM-DD-<slug>.manifest.json`, matching scanner and manifest.ts

## Manifest Validation Schema
- ALWAYS use shared manifest validation schema for both scanner (read) and reconciler (write) — single source of truth for manifest structure
- Required fields: `phase` (valid Phase literal), `design` (string), `features` (array of objects with `slug: string` and `status: string`), `lastUpdated` (string)
- ALWAYS strictly reject manifests missing required fields — skip entirely, no partial parsing
- ALWAYS validate feature status values — must be one of: pending, in-progress, completed, blocked
- Skipped manifests visible only with `--verbose` flag on status command

## Type Architecture
- ALWAYS use single EpicState interface in state-scanner.ts — canonical type for scanner, status command, and watch command
- ALWAYS delete watch-types.ts — watch command imports types from state-scanner.ts
- ALWAYS collapse blocked/gateBlocked/blockedGate/gateName into single `blocked: boolean` field
- When blocked is true, status output shows: `blocked: run beastmode <phase> <slug>`
- ALWAYS remove costUsd from EpicState — cost tracking removed from scanner entirely

## Phase Source of Truth
- ALWAYS use top-level `manifest.phase` as the single phase field — replaces both marker files and the `manifest.phases` map
- NEVER read phase marker files (`validate-<slug>`, `release-<slug>`) — eliminated in favor of `manifest.phase`
- NEVER read or write the `manifest.phases` map — superseded by top-level `manifest.phase`
- ALWAYS let the reconciler be the sole writer of `manifest.phase` — scanner never advances phase
- ALWAYS remove derivePhase heuristic function, output.json waterfall logic, hasPhaseMarker, hasLegacyArtifact — replaced by direct manifest.phase read

## Merge Conflict Resolution
- ALWAYS auto-resolve git merge conflict markers in manifest files before parsing — preserves epic visibility after parallel merges
- ALWAYS take ours-side content (before `=======`) when conflict markers are detected — deterministic resolution
- NEVER crash on conflict markers — strip markers, attempt parse, maintain epic tracking

## Gate Detection
- ALWAYS use reactive gate blocking — check manifest feature statuses for `blocked` entries only
- NEVER do preemptive config gate checking in the scanner — agents run until they hit a gate and report back
- ALWAYS add `validate` phase to GatesConfig type in config.ts — was missing

## Error Handling
- ALWAYS skip the tick and retry on next poll when scanner errors occur — no retry limit, infinite retry with logging
- ALWAYS handle missing or empty pipeline directories gracefully — return empty array, no crash
- ALWAYS warn on slug collisions via stderr — use newest (last sorted) manifest when duplicates exist
- ALWAYS strictly reject manifests with missing `phase` field — skip entirely, not crash

## Cost Separation
- NEVER aggregate costs in the scanner — cost tracking removed from scanner and status command entirely
- Remove costUsd, aggregateCost, readRunLog from scanner

context/design/state-scanner.md
