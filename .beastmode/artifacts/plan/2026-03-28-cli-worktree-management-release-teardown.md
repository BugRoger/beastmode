# release-teardown

**Design:** .beastmode/state/design/2026-03-28-cli-worktree-management.md
**Architectural Decisions:** see manifest

## User Stories

3. As a developer, I want the watch loop (`beastmode watch`) to follow the same lifecycle semantics as manual `beastmode <phase>` — create-once, persist, merge-at-implement, squash-at-release — so that automated and manual execution behave identically.

5. As a developer, I want failed phases to leave the worktree as-is so I can retry the same phase without losing partial progress, so that error recovery is simple and idempotent.

## What to Build

Add release completion logic to the run command: after the release phase SDK session completes successfully, the CLI squash-merges the epic's feature branch to main using the existing `worktree.merge()`, archives the branch tip (tag or ref), and removes the worktree via `worktree.remove()`.

Error recovery semantics: if any phase fails (non-zero exit), the CLI leaves the worktree directory and branch intact. The next invocation of the same phase picks up from the dirty state. This is largely already how `worktree.create()` works (idempotent return of existing worktree), but the run command must not attempt cleanup on failure.

The watch loop must use the same lifecycle functions as the manual `beastmode <phase>` path. Both paths call `worktree.create()`, `worktree.enter()`, runners, and — at release — `worktree.merge()` and `worktree.remove()`. Verify the watch loop's `dispatchPhase` in watch-command.ts aligns with the run command's lifecycle.

## Acceptance Criteria

- [ ] `beastmode release <slug>` squash-merges feature branch to main after successful completion
- [ ] Branch tip archived (tagged or ref'd) before deletion
- [ ] Worktree removed after successful release
- [ ] Failed phases leave worktree intact — no cleanup on error
- [ ] Retry of same phase reuses existing worktree without data loss
- [ ] Watch loop release path uses same merge/remove lifecycle as manual
- [ ] Integration test covers full lifecycle: design -> plan -> implement -> validate -> release
