---
phase: plan
slug: release-rebase-fix
epic: release-rebase-fix
feature: rebase-before-squash
wave: 1
---

# Rebase Before Squash

**Design:** `.beastmode/artifacts/design/2026-04-11-release-rebase-fix.md`

## User Stories

1. As a release operator, I want the feature branch rebased onto latest main before squash merge, so that intermediate main commits are not overwritten during release.

2. As a release operator, I want code file conflicts during squash merge to fail loudly instead of silently resolving with `--theirs`, so that I can review and resolve genuine conflicts manually.

## What to Build

Rewrite the release skill's "Squash Merge to Main" step (Checkpoint step 3) to insert a rebase of the feature branch onto main before the squash merge. The new sequence:

1. Navigate to the main repo (parent of worktree)
2. Checkout main and pull latest
3. Create the archive tag pointing at the feature branch HEAD (before rebase, preserving original history)
4. Navigate back to the feature worktree
5. Run `git rebase main` — if conflicts arise, the LLM resolves them interactively (git add + git rebase --continue per commit)
6. Navigate back to the main repo
7. Run `git merge --squash` of the now-rebased feature branch

Replace the conflict resolution instructions:
- Remove the `--theirs` rule for code files entirely
- Remove the `--theirs` rule for `.beastmode/` files
- Keep `--ours` for CHANGELOG.md and version files (plugin.json, marketplace.json) — these are deliberately managed post-merge
- Add a note: post-rebase, any remaining squash merge conflicts on code files indicate genuine divergence and should fail loudly for manual review

Update the "Constraints" section at the bottom of the release skill to reflect the new rebase requirement.

## Integration Test Scenarios

<!-- No behavioral scenarios — release skill instructions are LLM-executed, not CLI code testable via Gherkin -->

## Acceptance Criteria

- [ ] Release skill step 3 includes `git rebase main` after archive tag and before squash merge
- [ ] Archive tag is created before the rebase (preserves pre-rebase commit history)
- [ ] No `--theirs` conflict resolution rule exists for code files or .beastmode/ files
- [ ] `--ours` resolution for CHANGELOG.md and version files is preserved
- [ ] Rebase conflict handling instructions are present (LLM resolves interactively)
- [ ] Step 3 sequence: checkout main → pull → tag archive → (back to worktree) → rebase main → (back to main repo) → merge --squash
