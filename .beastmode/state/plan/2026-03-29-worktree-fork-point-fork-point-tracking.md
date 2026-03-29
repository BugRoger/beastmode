# Fork Point Tracking

**Design:** `.beastmode/state/design/2026-03-29-worktree-fork-point.md`

## User Stories

1. As a developer, I want worktrees to fork from my local main branch, so that I control the base state through explicit pull/fetch rather than relying on a stale cached ref.
2. As a developer, I want the fork-point SHA recorded when a worktree is created, so that I have an audit trail of what the feature was based on.
3. As a developer, I want the main branch name resolved automatically (with fallback to "main"), so that the system works regardless of whether the default branch is called main, master, or something else.
4. As a developer, I want fork-point derivation to fail gracefully (returning undefined), so that worktree creation is never blocked by edge cases like unrelated histories.

## What to Build

Add a `resolveMainBranch()` helper that resolves the default branch name from `git symbolic-ref refs/remotes/origin/HEAD`, stripping the `refs/remotes/origin/` prefix. Falls back to `"main"` on failure. This helper is shared by `create()` and `merge()`.

Modify the `create()` function to fork new branches from the local main branch instead of `origin/HEAD`. For new branches, capture the fork-point SHA via `git rev-parse` of the resolved local main at creation time. For existing branches (local or remote), derive the fork-point via `git merge-base`. If `merge-base` fails, set `forkPoint` to `undefined` — no crash.

Expand the `WorktreeInfo` interface with `mainBranch: string` and `forkPoint?: string`. All callers receive richer metadata without breaking — the new fields are additive.

Extend the integration test suite with tests for `resolveMainBranch()` (both resolution paths), fork-point on new branches, fork-point on existing branches, graceful undefined on merge-base failure, and a second describe block with a cloned repo to exercise the `git symbolic-ref` path.

## Acceptance Criteria

- [ ] `resolveMainBranch()` returns the stripped branch name when `git symbolic-ref refs/remotes/origin/HEAD` succeeds
- [ ] `resolveMainBranch()` returns `"main"` when the symbolic-ref command fails (no remote)
- [ ] New worktrees fork from the local main branch, not `origin/HEAD`
- [ ] `WorktreeInfo` includes `mainBranch` field matching the resolved branch name
- [ ] `WorktreeInfo` includes `forkPoint` field with the SHA of the fork point for new branches
- [ ] Existing branches get `forkPoint` derived via `git merge-base`
- [ ] `forkPoint` is `undefined` when `merge-base` fails (unrelated histories, missing branch)
- [ ] All existing tests pass without modification (additive change)
- [ ] New tests cover both `resolveMainBranch()` paths, fork-point for new/existing branches, and graceful failure
