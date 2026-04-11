---
phase: design
slug: release-rebase-fix
epic: release-rebase-fix
---

## Problem Statement

The release process squash-merges a feature branch into main, but the feature branch forks from a stale point. Commits made to main between the fork and the merge (e.g., hotfixes, other releases) get silently overwritten because: (1) the squash merge produces a diff relative to the stale fork point that doesn't include intermediate main changes, and (2) the `--theirs` conflict resolution rule for code files discards main's version in favor of the feature branch's stale copy. This has already caused data loss (commit 92d09fa8 was a manual restore of work clobbered by v0.105.0).

## Solution

Rebase the feature branch onto latest main before the squash merge, remove the `--theirs` conflict resolution rule for code files, and clean up the dead `merge()` function from the CLI.

## User Stories

1. As a release operator, I want the feature branch rebased onto latest main before squash merge, so that intermediate main commits are not overwritten during release.

2. As a release operator, I want code file conflicts during squash merge to fail loudly instead of silently resolving with `--theirs`, so that I can review and resolve genuine conflicts manually.

3. As a CLI maintainer, I want the dead `merge()` function removed from `worktree.ts`, so that the codebase doesn't contain unused merge logic that contradicts the current architecture.

## Implementation Decisions

- Add `git rebase main` to the release skill's checkpoint phase, after committing release artifacts to the feature branch (step 2) and before checking out main (step 3)
- The archive tag (`archive/$feature_branch`) must be created before the rebase so the original pre-rebase commit history is preserved
- Reorder step 3 to: (a) cd to main repo, (b) checkout main, (c) git pull, (d) tag archive, (e) cd back to feature worktree, (f) git rebase main, (g) cd back to main repo, (h) git merge --squash
- If the rebase encounters conflicts, the LLM resolves them interactively (git add + git rebase --continue per commit)
- Remove the `--theirs` conflict resolution rule for code files from the release skill — post-rebase, code file conflicts during squash merge indicate a genuine divergence and should fail
- Keep `--ours` resolution for CHANGELOG.md and version files (plugin.json, marketplace.json) — these are deliberately managed post-merge on main
- Remove the `--theirs` rule for `.beastmode/` files — same principle as code files; after rebase, conflicts are genuine
- Remove the dead `merge()` function from `cli/src/git/worktree.ts` (lines ~396-412) — it was disconnected by the March 29 design but never deleted
- Keep `archive()` in `worktree.ts` — it's still called by `runner.ts` during release teardown

## Testing Decisions

- The primary test is the next release cycle — verify no intermediate main commits are lost
- The `merge()` removal can be verified by checking that no imports reference it and that existing tests still pass
- A good integration test would simulate: commit to main, create feature branch, commit to feature, run release, verify main contains both changes

## Out of Scope

- Updating `.beastmode/context/RELEASE.md` — retro handles knowledge hierarchy updates
- Changing the archive/worktree lifecycle in the CLI — only the release skill's merge sequence changes
- Adding automated pre-release checks for fork point staleness
- Changing the branch naming convention or worktree management

## Further Notes

The March 4 design (release-merge-fix) originally dropped rebase in favor of merge-only to reduce conflicts. This design partially reverses that decision by reintroducing rebase, but at a different point in the sequence (rebase the feature branch onto main before squash, rather than rebasing before merge). The key insight is that the rebase prevents the stale fork point problem that the original merge-only approach was vulnerable to.

## Deferred Ideas

- A pre-release check that warns if the feature branch's fork point is more than N commits behind main, before entering the release phase
- An automated test that verifies no file regressions during squash merge by diffing main before and after
