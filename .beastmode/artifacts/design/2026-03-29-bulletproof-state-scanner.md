## Problem Statement

The CLI state scanner has two divergent implementations (state-scanner.ts and scanEpicsInline in watch-command.ts) with 19 concrete divergences including missing phase support, broken validate/release transitions, incomplete gate coverage, and different error handling. Merge conflicts in manifest files cause silent phase regressions or invisible epics. The scanner depends on design files as the entry point instead of manifests (the declared source of truth). Phase tracking uses separate marker files alongside manifests, creating dual sources of truth. No unit tests exist. When multiple epics run in parallel worktrees, these issues compound — merged manifests can have conflict markers, and the two scanners disagree about epic state.

## Solution

Rewrite state-scanner.ts as the single canonical scanner. Use manifests as the sole epic anchor (no design file dependency). Read phase from a new top-level `manifest.phase` field instead of separate marker files. Auto-resolve git merge conflict markers in manifests. Move to reactive gate blocking (check manifest feature status only, not preemptive config gate checking). Remove cost aggregation from the scanner (separate concern). Add comprehensive unit tests. Update the reconciler to advance `manifest.phase` instead of writing marker files.

## User Stories

1. As a pipeline operator, I want the state scanner to correctly identify epic phase from a single manifest field, so that phase derivation is deterministic and debuggable.
2. As a pipeline operator, I want the scanner to auto-resolve git merge conflict markers in manifest files, so that parallel epic merges don't cause silent phase regressions or invisible epics.
3. As a pipeline operator, I want a single canonical scanner implementation, so that the watch loop and status command always agree about epic state.
4. As a pipeline operator, I want the scanner to detect and warn on slug collisions, so that duplicate epic names don't silently shadow each other.
5. As a pipeline operator, I want the scanner to handle missing or empty pipeline directories gracefully, so that first-boot and clean-state scenarios don't crash.
6. As a developer, I want comprehensive unit tests for every phase transition and edge case, so that future changes to the scanner don't regress correctness.

## Implementation Decisions

- **Kill inline scanner**: Remove `scanEpicsInline()` from watch-command.ts entirely. Remove the try/catch dynamic import fallback. Import state-scanner directly. A clean error is better than silently wrong data.
- **Manifests-only anchoring**: Scanner discovers epics by reading manifest files from the pipeline directory only. Design files are not required. Pre-manifest epics (pre-2026-03-28) are all released and don't need tracking.
- **Top-level `manifest.phase` field**: Add a `phase` field to manifest JSON with values: `plan | implement | validate | release | released`. Scanner reads this field directly — no inference from features or markers needed. The reconciler is the sole writer of this field.
- **Reconciler phase advancement**: `reconcilePlan()` sets `phase: "implement"` after populating features. `markFeatureCompleted()` checks if all features are completed and sets `phase: "validate"`. `updatePhaseStatus()` advances phase through validate → release → released.
- **Remove phase marker files**: The `validate-<slug>` and `release-<slug>` marker files in the pipeline dir are replaced by `manifest.phase`. Remove marker file reading/writing from both scanner and reconciler. Remove marker seeding from `seedPipelineState()`.
- **Merge conflict auto-resolution**: Before JSON.parse, check for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). If found, take the ours-side (content before `=======`), strip marker lines, and attempt to parse. This preserves epic visibility when git merges produce conflicts in `state/plan/` manifests. The pipeline dir is gitignored so conflicts only affect seed data.
- **Reactive gate blocking**: Scanner only checks manifest feature statuses for `blocked` entries. No preemptive config gate checking. Agents run until they hit a human gate and report back.
- **No cost aggregation**: Remove `costUsd` from `EpicState`. Cost aggregation from `.beastmode-runs.json` is a separate concern handled by `beastmode status`.
- **Slug collision warning**: If multiple manifests resolve to the same slug, log a warning to stderr and use the newest (last sorted) manifest.
- **Error resilience**: Scanner errors in the watch loop skip the tick and retry on next poll. No retry limit. Infinite retry with logging — human can see it's broken and intervene.
- **Manifest migration**: Existing manifests in `pipeline/` get patched during implementation to add the `phase` field based on current derived state.
- **Remove `manifest.phases` map**: The `phases: { design: "completed", plan: "completed", ... }` map written by the current reconciler is superseded by the top-level `phase` field. Remove writes to `manifest.phases` from the reconciler.

## Testing Decisions

- Full unit test suite using Bun test runner (`bun test`)
- Mock filesystem for isolation — create temp directories with known manifest structures
- Test every phase transition: plan → implement → validate → release → released
- Test merge conflict auto-resolution: manifest with conflict markers produces valid state
- Test empty/missing pipeline dir: returns empty array, no crash
- Test slug collision: multiple manifests for same slug logs warning, uses newest
- Test blocked feature detection: feature with `blocked` status marks epic as gate-blocked
- Test `released` terminal state: no next action, epic is done
- Test missing `phase` field: scanner handles gracefully (error/skip, not crash)
- Prior art: no existing tests in cli/src/ to reference — this is the first test file

## Out of Scope

- Design phase orchestration (interactive, stays manual)
- Cost aggregation and run log management (separate concern for status command)
- Run log race condition fixes (not scanner's responsibility)
- GitHub sync logic (checkpoint concern, not scanner)
- cmux integration changes
- Manifest schema versioning

## Further Notes

The reconciler in watch-command.ts has an existing `updatePhaseStatus()` function that writes to `manifest.phases` (a map). This PRD replaces that with a top-level `phase` string field. The `manifest.phases` map can be removed or left as dead data — the scanner will ignore it.

The scanner is intentionally read-only. It never writes to the filesystem. The reconciler is the sole writer. This separation is critical for correctness — the scanner can run on any tick without side effects.

## Deferred Ideas

None
