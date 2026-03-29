## Problem Statement

Worktrees fork from `origin/HEAD`, a cached git ref that is only updated during `clone` or `fetch`. If the remote hasn't been fetched recently, worktrees silently branch from stale code. Additionally, the fork-point SHA is never recorded — the manifest tracks the branch name and worktree path but not where the branch diverged from main. This leaves no audit trail and no stable reference point for future merge coordination.

## Solution

Change worktree creation to fork from the local main branch instead of `origin/HEAD`. Record the fork-point SHA in `WorktreeInfo` at creation time. Expose the resolved main branch name so all worktree lifecycle operations (create, merge) use a consistent, single-source-of-truth reference for the default branch.

## User Stories

1. As a developer, I want worktrees to fork from my local main branch, so that I control the base state through explicit pull/fetch rather than relying on a stale cached ref.
2. As a developer, I want the fork-point SHA recorded when a worktree is created, so that I have an audit trail of what the feature was based on.
3. As a developer, I want the main branch name resolved automatically (with fallback to "main"), so that the system works regardless of whether the default branch is called main, master, or something else.
4. As a developer, I want fork-point derivation to fail gracefully (returning undefined), so that worktree creation is never blocked by edge cases like unrelated histories.

## Implementation Decisions

- Add `resolveMainBranch()` helper to `worktree.ts` — runs `git symbolic-ref refs/remotes/origin/HEAD`, strips `refs/remotes/origin/` prefix to get the branch name, falls back to `"main"` on failure. Extracted as a shared helper so `create()` and `merge()` use the same resolution logic.
- Modify `create()` to use local main branch as the base for new worktrees instead of `origin/HEAD`. Replace `git rev-parse --verify origin/HEAD` with `git rev-parse --verify <resolvedMainBranch>`.
- For new branches, capture the fork-point SHA via `git rev-parse` of the resolved local main branch at creation time.
- For existing branches (local or remote), derive the fork-point via `git merge-base <main> <branch>`.
- If `merge-base` fails (unrelated histories, detached HEAD, missing branch), set `forkPoint` to `undefined` — log a warning, don't crash.
- Expand `WorktreeInfo` interface with `mainBranch: string` and `forkPoint?: string`.
- The merge coordinator is NOT modified in this feature — fork-point is recorded for future use but not consumed by merge logic yet.

## Testing Decisions

- Extend existing `cli/test/worktree.test.ts` integration tests.
- Update existing `create()` tests to assert on the new `mainBranch` and `forkPoint` fields in the returned `WorktreeInfo`.
- Add tests for `resolveMainBranch()`: symbolic-ref resolution path and fallback-to-"main" path.
- Add test for fork-point derivation on new branches (should equal the main branch HEAD SHA).
- Add test for fork-point derivation on existing branches (should use merge-base).
- Add test for graceful `undefined` fork-point when merge-base fails.
- Add a second describe block with a cloned repo to exercise the `git symbolic-ref` path (existing test setup has no remote).
- Follow existing test patterns: real temp git repos, `beforeAll`/`afterAll` lifecycle, `git()` helper for subprocess calls.

## Out of Scope

- Merge coordinator changes to consume the fork-point (separate feature)
- Manifest schema changes to persist fork-point (downstream of WorktreeInfo — CLI reads it from the return value)
- Automatic `git fetch` before worktree creation
- Fork-point refresh for long-running features

## Further Notes

None

## Deferred Ideas

- Merge coordinator could use fork-point to detect main drift and warn before merging
- Manifest could persist fork-point for cross-session visibility
- `beastmode status` could show how far behind main each worktree's fork-point is
