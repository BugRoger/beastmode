## Problem Statement

`beastmode status` displays inaccurate phase data for epics. The state scanner accepts malformed manifests without validation, uses a brittle MANIFEST_EPOCH date heuristic to classify pre-manifest epics, and scans legacy state directories with inconsistent logic. Stale pipeline manifests (seeded copies of state/plan/ that were never updated by the watch loop) further corrupt the output by providing all-completed-features manifests with no phase markers, causing shipped epics to show as "validate" or "plan" instead of "release."

## Solution

Rewrite the state scanner's manifest handling and phase derivation logic. Add structural validation that rejects malformed manifests. Replace legacy artifact scanning with output.json-based phase detection. Wipe the stale pipeline manifests. Remove the watch-command's seedPipelineState function that would re-introduce bad data, and remove its dead inline scanner fallback. The result is a clean-slate status command that only shows epics with properly-formatted pipeline state.

## User Stories

1. As a user running `beastmode status`, I want to see only epics with valid pipeline state, so that the output reflects reality instead of showing ghost epics with wrong phases.
2. As a user with malformed manifest files, I want the scanner to skip them with a warning instead of deriving incorrect state, so that bad data doesn't silently corrupt the status output.
3. As a user who has shipped epics through the full pipeline, I want phase detection based on output.json checkpoint files, so that completed phases are accurately tracked.
4. As a user running `beastmode watch`, I want the watch loop to not re-seed stale manifests into the pipeline directory on startup, so that wiped bad data stays gone.
5. As a developer working on the CLI, I want the watch-command to import state-scanner directly instead of maintaining a duplicate inline scanner, so that there's one source of truth for epic state derivation.
6. As a developer, I want the state scanner tests to validate the new behavior (structural validation, output.json phase detection, malformed manifest skipping), so that regressions are caught.

## Implementation Decisions

- Manifest source is pipeline/ directory only — scanner does not read from state/plan/
- Manifest validation is structural: required fields are `design` (string), `features` (array of objects each with `slug` string and `status` string), `lastUpdated` (string). Missing or wrong-typed fields → skip manifest, log warning to stderr
- Phase derivation uses output.json files located at `state/<phase>/YYYY-MM-DD-<slug>.output.json`. Scanner checks for existence of these files per phase. Waterfall: release output.json → release, validate → validate, all features completed → implement-done, pending features → implement, manifest exists → plan, else → design
- Remove MANIFEST_EPOCH heuristic entirely
- Remove hasPhaseMarker and hasLegacyArtifact helper functions
- Delete all existing `.beastmode/pipeline/*.manifest.json` files (data wipe)
- Remove seedPipelineState function from watch-command.ts — manifests only appear in pipeline/ when reconcileState writes them after successful phase runs
- Remove scanEpicsInline fallback from watch-command.ts — direct import of state-scanner.scanEpics
- Clean-slate migration: existing epics without output.json files will not appear in status output until they are re-processed through the pipeline
- output.json schema: `{ "status": "completed", "artifacts": { ... } }` — required fields are `status` (string) and `artifacts` (object)

## Testing Decisions

- Update existing state-scanner.test.ts tests to use output.json files instead of legacy state/<phase>/ directory artifacts for phase detection
- Add test: malformed manifest (missing required fields) is skipped, does not appear in scan results
- Add test: manifest with invalid JSON is skipped
- Add test: output.json in state/release/ causes epic to show as release phase
- Add test: output.json in state/validate/ with no release output.json causes epic to show as validate phase
- Remove test for pre-MANIFEST_EPOCH date handling (heuristic removed)
- Existing test patterns (beforeEach setup, afterEach teardown, TEST_ROOT temp dir) are appropriate prior art

## Out of Scope

- Fixing the gate-blocked conflation bug (every epic in a phase with human gates shows as "blocked")
- Fixing the blocked/gateBlocked field redundancy on EpicState
- Changing the status command output format or adding filtering
- Adding feature-level detail to status output
- Updating the watch-command's reconcileState to write output.json files (that's a separate concern — checkpoint skills write output.json, not the CLI)
- Signal-to-noise improvements (hiding completed epics, etc.)

## Further Notes

The watch-command's reconcileState function writes manifests and phase markers to pipeline/ at runtime after successful phase dispatches. This is unaffected — reconcileState creates manifests with the correct format because it builds them from scratch using worktree scan results. The problem was only with seedPipelineState copying old-format manifests from state/plan/.

## Deferred Ideas

- Unify the watch-command's reconcileState manifest writes with a shared manifest writer module (currently reconcileState builds manifests inline)
- Add a `beastmode gc` command to clean up stale pipeline state and orphaned worktrees
- Add output.json writing to all phase checkpoint skills (currently only design checkpoint spec includes it)
