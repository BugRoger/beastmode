# State Scanner

## Scanner Architecture
- state-scanner.ts is gutted or deleted — scanning is now a composition of store.list() + manifest.deriveNextAction()
- NEVER maintain a standalone scanner module — manifest-store.ts and manifest.ts replace all scanner functionality
- ALWAYS discover epics via store.list() — reads manifest files from `.beastmode/state/` directory
- ALWAYS read phase from the top-level `manifest.phase` field — no inference from features, markers, or phases map
- Valid phase values: `design | plan | implement | validate | release | cancelled`

## Manifest Validation Schema
- PipelineManifest is the sole manifest type — EpicState, FeatureProgress, ScanResult, and the old Manifest interface are all deleted
- Required fields: `slug` (string, immutable hex), `phase` (valid Phase literal), `features` (ManifestFeature[]), `lastUpdated` (ISO-8601 string)
- Optional fields: `epic` (string, human-readable name after rename), `originId` (string, birth hex for lineage), `artifacts` (Record<string, string[]>), `summary` ({ problem, solution }), `worktree` ({ branch, path }), `github` ({ epic, repo, bodyHash? })
- ManifestFeature extended with optional `description` field — plan checkpoint populates it
- manifest-store.ts owns the validate() function — single source of truth for manifest structure
- Slug format validated against `[a-z0-9](?:[a-z0-9-]*[a-z0-9])?` via `isValidSlug()`

## Type Architecture
- ALWAYS use PipelineManifest as the sole type — canonical for store, state machine, status command, and watch command
- ALWAYS delete watch-types.ts — watch command imports from manifest-store.ts
- ALWAYS remove costUsd from manifest types — cost tracking removed entirely

## Phase Source of Truth
- ALWAYS use top-level `manifest.phase` as the single phase field — replaces both marker files and the `manifest.phases` map
- NEVER read phase marker files — eliminated in favor of `manifest.phase`
- ALWAYS let manifest.ts pure functions be the sole phase mutators — advancePhase(), regressPhase()

## Merge Conflict Resolution
- ALWAYS auto-resolve git merge conflict markers in manifest files before parsing — preserves epic visibility after parallel merges
- ALWAYS take ours-side content (before `=======`) when conflict markers are detected — deterministic resolution
- NEVER crash on conflict markers — strip markers, attempt parse, maintain epic tracking

## Error Handling
- ALWAYS skip the tick and retry on next poll when scanner errors occur — no retry limit, infinite retry with logging
- ALWAYS handle missing or empty state directories gracefully — return empty array, no crash
- ALWAYS warn on slug collisions via stderr — use newest (last sorted) manifest when duplicates exist

## Cost Separation
- NEVER aggregate costs in the scanner — cost tracking removed from scanner and status command entirely
