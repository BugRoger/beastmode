---
phase: plan
slug: release-rebase-fix
epic: release-rebase-fix
feature: remove-dead-merge
wave: 1
---

# Remove Dead Merge

**Design:** `.beastmode/artifacts/design/2026-04-11-release-rebase-fix.md`

## User Stories

3. As a CLI maintainer, I want the dead `merge()` function removed from `worktree.ts`, so that the codebase doesn't contain unused merge logic that contradicts the current architecture.

## What to Build

Remove the `merge()` function from the worktree module. It was disconnected by the March 29 design (remove-merge-logic-from-cli) but the function body was never deleted. No callers exist — the function is exported but never imported anywhere.

Additionally, update the module's docstring comment to remove `merge` from the listed operations. The current comment lists "create, enter, exists, archive, merge, remove" — remove the `merge` entry.

Keep `archive()` — it's still actively called by the pipeline runner during release teardown.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] The `merge()` function is deleted from the worktree module
- [ ] The module docstring no longer lists `merge` as a lifecycle operation
- [ ] The `archive()` function is untouched and still present
- [ ] All existing tests pass (no imports of `merge` exist to break)
- [ ] No other files reference the removed function
