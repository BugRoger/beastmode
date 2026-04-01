---
phase: plan
slug: design-cleanup
epic: design-cleanup
feature: design-abandon-guard
wave: 1
---

# Design Abandon Guard

**Design:** `.beastmode/artifacts/design/2026-04-01-c3cc89.md`

## User Stories

1. As a user, I want to quit a design session early without leaving orphaned worktrees and manifests behind
2. As a user, I want the CLI to automatically clean up when a design session crashes (non-zero exit)
3. As a user, I want `beastmode status` to show no trace of abandoned designs (no ghost epics in plan phase)
4. As a pipeline operator, I want the watch loop to never dispatch plan on an epic that has no PRD
5. As a developer, I want `manifest-store.delete()` to be idempotent so cleanup is safe to retry

## What to Build

Two defense layers that detect when a design session ends without producing a PRD (output.json), then automatically clean up all artifacts.

**Primary gate in the phase dispatcher:** After `runInteractive()` returns (regardless of exit status), check whether `loadWorktreePhaseOutput()` finds an output.json for the design phase. If no output exists, run a cleanup sequence instead of proceeding to post-dispatch. The cleanup sequence mirrors the existing cancel command pattern: remove the worktree (force, with branch deletion), delete the manifest file via the existing `store.remove()` function, and close any GitHub epic issue as `not_planned` using `gh issue close --reason "not planned"` with warn-and-continue error handling. Log a message like `"Design abandoned — cleaning up worktree and manifest"` before cleanup. Both non-zero exit (crash/Ctrl+C) and zero exit without output (graceful quit) trigger the same cleanup path.

**Secondary guard in post-dispatch:** At the top of the design case in post-dispatch, check whether phase output was loaded. If the phase is design and no output exists, return early without sending `DESIGN_COMPLETED` to the state machine. This prevents state machine advancement even if the primary gate is somehow bypassed (e.g., the ReconcilingFactory edge case). This is a defensive backstop, not the primary cleanup mechanism.

**No new manifest-store function needed:** The existing `store.remove()` function already provides idempotent manifest file deletion (returns `false` if file not found, never throws).

## Acceptance Criteria

- [ ] Quitting a design session (Ctrl+C or graceful exit) with no PRD produced leaves no worktree, no branch, no manifest file
- [ ] `beastmode status` shows no trace of the abandoned design after cleanup
- [ ] Cleanup logs an informational message indicating the design was abandoned
- [ ] GitHub epic issue (if created) is closed as `not_planned` during cleanup
- [ ] GitHub close failure does not block cleanup (warn-and-continue)
- [ ] `store.remove()` called on a non-existent manifest returns false without throwing
- [ ] Post-dispatch returns early for design phase with no output — `DESIGN_COMPLETED` is never sent
- [ ] Both exit statuses (success with no output, error/crash) trigger the cleanup path
- [ ] Cleanup is idempotent — safe to retry if partially executed
- [ ] Unit tests for the primary gate logic (mock runInteractive, verify cleanup calls)
- [ ] Unit tests for the post-dispatch secondary guard (design phase, no output → early return)
