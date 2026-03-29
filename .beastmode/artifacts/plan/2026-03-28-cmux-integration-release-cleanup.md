# release-cleanup

**Design:** .beastmode/state/design/2026-03-28-cmux-integration.md
**Architectural Decisions:** see manifest

## User Stories

1. US 4: As an operator, I want cmux surfaces to be automatically cleaned up when an epic is released so stale terminals don't accumulate

## What to Build

A cleanup step that destroys an epic's cmux workspace and all its surfaces when the release phase completes successfully.

**Trigger:** When `watchSession()` processes a completed release-phase session with success status.

**Cleanup flow:**
1. Check if cmux is available — if not, skip
2. Look up the workspace for this epic's slug
3. Close all surfaces in the workspace
4. Remove the workspace itself
5. Log: "Cleaned up cmux workspace for <epic-slug>"

**Cleanup timing** is controlled by `cmux.cleanup` config:
- `on-release` (default): cleanup fires on release completion (described above)
- `immediate`: cleanup fires when each individual surface's session completes (surface only, not workspace)
- `manual`: no automatic cleanup — operator manages surfaces themselves

The cleanup module mirrors the git worktree lifecycle: worktrees are created at dispatch and removed at release. cmux workspaces follow the same pattern.

**Edge case:** If the workspace doesn't exist in cmux (e.g., operator already closed it manually), the cleanup is a no-op. All cmux calls use warn-and-continue — cleanup failures are logged but don't block the release.

## Acceptance Criteria

- [ ] Workspace and surfaces cleaned up on successful release completion
- [ ] `on-release` mode destroys workspace after release phase
- [ ] `immediate` mode destroys individual surfaces on session completion
- [ ] `manual` mode performs no automatic cleanup
- [ ] Cleanup is no-op when cmux unavailable or workspace already gone
- [ ] Cleanup failures logged but don't block release
- [ ] Tests covering each cleanup mode and edge cases
