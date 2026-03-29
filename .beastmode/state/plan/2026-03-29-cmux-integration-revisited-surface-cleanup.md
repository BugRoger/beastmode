# Surface Cleanup

**Design:** `.beastmode/state/design/2026-03-29-cmux-integration-revisited.md`

## User Stories

1. As an operator, I want cmux surfaces to be automatically cleaned up when an epic is released so stale terminals don't accumulate (US 4)

## What to Build

When the release phase completes for an epic, close the epic's cmux workspace and all its surfaces. This mirrors the existing worktree teardown lifecycle — when the worktree is archived and removed, the visual representation is cleaned up too.

**Integration point**: The watch loop's `watchSession()` handler already detects release completion and triggers worktree merge/archive/remove. Add a strategy `cleanup()` call at this same point, after the worktree is processed but before the session is fully removed from the tracker.

**Cleanup behavior**: `CmuxStrategy.cleanup()` receives the epic slug, looks up the workspace ID from its internal map, and calls `CmuxClient.closeWorkspace()` to remove the workspace and all surfaces. If the workspace is already gone (race condition or manual close), log and continue — best-effort, never errors.

**SdkStrategy cleanup**: No-op. SDK sessions have no persistent resources beyond the in-process promise, which is already resolved by this point.

**Graceful degradation**: If cmux is unreachable during cleanup (e.g., user quit cmux), log a warning and continue. The workspace will be cleaned up by the next startup reconciliation if cmux is relaunched.

## Acceptance Criteria

- [ ] Release completion triggers workspace cleanup for the epic
- [ ] `CmuxStrategy.cleanup()` closes workspace and all surfaces
- [ ] Already-closed workspace handled gracefully (no error)
- [ ] Unreachable cmux handled gracefully (warning, not error)
- [ ] `SdkStrategy.cleanup()` is a no-op
- [ ] Cleanup runs after worktree teardown in the watch session handler
- [ ] Unit tests verify cleanup is called on release completion
- [ ] Unit tests verify graceful handling of cmux failures
