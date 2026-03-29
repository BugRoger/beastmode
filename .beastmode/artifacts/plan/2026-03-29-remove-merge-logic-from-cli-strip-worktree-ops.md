# strip-worktree-ops

**Design:** .beastmode/state/design/2026-03-29-remove-merge-logic-from-cli.md

## User Stories

1. As a CLI user, I want the release phase to simply remove the worktree after a successful release, so that the CLI doesn't make irreversible git state changes on my behalf.

3. As a CLI user, I want `beastmode cancel` to skip the archive step and just remove the worktree, update the manifest, and close the GitHub epic, so that cancel is simpler and doesn't create archive tags.

## What to Build

Three coordinated changes across the worktree module and its two consumers:

**Worktree module:** Remove the `merge()` and `archive()` functions. The module retains only lifecycle operations: `create`, `enter`, `ensureWorktree`, `exists`, `remove`, and `resolveMainBranch`. Update the module description/header to reflect the reduced scope.

**Release teardown (phase command):** Simplify the post-release block to call `removeWorktree()` only. Remove the archive and merge steps entirely. Remove imports of `archiveWorktree` and `mergeWorktree`.

**Cancel command:** Remove the archive step from the teardown sequence. Cancel becomes: remove worktree, update manifest, close GitHub epic. Remove the `archiveWorktree` import.

**Tests:** Update phase command tests to verify release teardown calls only `removeWorktree()`. Update cancel command tests to verify no archive call. Update any export-validation tests (e.g., run-command.test.ts) to remove assertions about `merge` and `archive` exports.

## Acceptance Criteria

- [ ] `worktree.ts` exports only: create, enter, ensureWorktree, exists, remove, resolveMainBranch
- [ ] `worktree.ts` has no `merge()` or `archive()` function
- [ ] Phase command release teardown calls `removeWorktree()` only — no archive, no merge
- [ ] Cancel command does not call `archiveWorktree()`
- [ ] No remaining imports of `archiveWorktree` or `mergeWorktree` in the codebase
- [ ] All tests pass with the reduced worktree API
