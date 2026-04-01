# Design Abandon Cleanup

## Context
When the design phase exits without producing a PRD (output.json) — whether via graceful quit, crash, or session abandonment — the CLI previously left orphaned artifacts: a worktree directory, a git branch, a manifest file that incorrectly advanced to plan phase, and potentially a GitHub issue. These ghost epics polluted `beastmode status` and caused the watch loop to dispatch plan on PRD-less epics.

## Decision
Two-layer defense detects missing output.json and cleans up automatically:

**Primary gate** (phase.ts): After `runInteractive()` returns (any exit status), checks `loadWorktreePhaseOutput(cwd, "design", epicSlug)`. If undefined, runs cleanup sequence before returning — `runPostDispatch()` is never called. Cleanup order: worktree removal (force, with branch deletion) -> manifest deletion via `store.remove()` -> GitHub issue close as `not_planned` (warn-and-continue). Both non-zero exit (crash/Ctrl+C) and zero exit without output (graceful quit) converge on the same path.

**Secondary guard** (post-dispatch.ts): Before generating `DESIGN_COMPLETED` event, verifies design output exists. If missing, returns empty event list. This is a defensive backstop for edge cases where the primary gate might be bypassed (ReconcilingFactory path, future direct post-dispatch callers).

Cleanup deletes the manifest entirely (not "cancelled" state) — zero trace after abandon. `store.remove()` is idempotent (returns false for missing files, never throws). The existing cancel command remains unchanged for user-initiated cancellation of any phase.

## Rationale
Two layers are needed because the primary gate in phase.ts and the post-dispatch event mapping are in different code paths that can be invoked independently. The primary gate handles the normal flow (interactive design -> check output -> cleanup or proceed). The secondary guard handles the edge case where post-dispatch is called directly (e.g., ReconcilingFactory during recovery). Neither layer assumes the other has run. Manifest deletion (not cancellation) prevents ghost epics from appearing in status or triggering watch loop dispatch. Warn-and-continue on GitHub closure ensures the local cleanup (worktree + manifest) always completes even if the GitHub API is unreachable.

## Source
.beastmode/artifacts/design/2026-04-01-c3cc89.md
.beastmode/artifacts/implement/2026-04-01-design-cleanup-design-abandon-gate.md
.beastmode/artifacts/implement/2026-04-01-design-cleanup-post-dispatch-guard.md
.beastmode/artifacts/validate/2026-04-01-design-cleanup.md
