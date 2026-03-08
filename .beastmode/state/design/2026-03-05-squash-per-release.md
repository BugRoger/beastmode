# Design: Squash Per Release

**Date:** 2026-03-05
**Status:** Approved

## Goal

One squashed commit per release version on main. Clean, scannable git history where each commit corresponds to exactly one published version. Retroactively rewrite existing 196-commit history to match.

## Approach

Two parts:

**Part 1 — Fix going forward:** Change `/release` skill to use `git merge --squash` instead of `git merge`. Archive feature branch tips as lightweight tags before deletion. Commit message uses GitHub release style format.

**Part 2 — Retroactive cleanup:** One-time script walks version tags (v0.1.5 through v0.10.0), creates one squashed commit per version with the tree state at that tag, rebuilds main as a linear sequence of ~20 commits, and force pushes.

## Key Decisions

### Locked Decisions

1. **Squash strategy: `git merge --squash`**
   - Context: Need to collapse feature branch history into one commit on main
   - Decision: Use `git merge --squash` at release time
   - Rationale: Minimal change to release workflow — one flag added to existing merge command. Feature branch keeps its full history for reference.

2. **Branch preservation: archive tags**
   - Context: Feature branches have useful commit-by-commit history for future reference
   - Decision: Tag branch tips as `archive/feature/<feature>` before deleting
   - Rationale: Lightweight tags preserve the commit graph without cluttering the branch namespace. Tags are immutable and won't be garbage collected.

3. **Retroactive cleanup: rewrite main**
   - Context: 196 commits on main with duplicates, WIP noise, merge commits, and leaked branch history
   - Decision: Rewrite main as one squashed commit per version tag
   - Rationale: One-time destructive operation. Version tags provide clean anchors. Result is ~20 commits that match the changelog.

4. **Commit message: GitHub release style**
   - Context: Need a format that works for single and multi-feature releases
   - Decision: `Release vX.Y.Z — Title` with categorized Features/Fixes/Artifacts sections in body
   - Rationale: Matches how GitHub renders release notes. Verbose enough to be self-documenting. Scales to multi-feature releases.

5. **Force push required**
   - Context: Retroactive rewrite changes commit SHAs on main
   - Decision: One-time `git push --force` after rewrite
   - Rationale: Unavoidable for history rewrite. Single developer project — no coordination needed.

### Claude's Discretion

- Script implementation details for the retroactive rewrite
- Exact changelog parsing for generating commit bodies
- Order of operations for tag migration

## Component Breakdown

### 1. Release Skill Changes (`skills/_shared/worktree-manager.md`)

**Merge Options — Option 1 (Merge Locally):**

Current:
```bash
git merge "$feature_branch"
```

New:
```bash
# Archive the branch tip before squash merge
git tag "archive/$feature_branch"

# Squash merge — collapses all branch commits into one staged changeset
git merge --squash "$feature_branch"

# Commit with GitHub release style message
git commit -m "Release vX.Y.Z — Title

## Features
- Feature 1
- Feature 2

## Fixes
- Fix 1

## Artifacts
- Design: .beastmode/state/design/YYYY-MM-DD-<feature>.md
- Plan: .beastmode/state/plan/YYYY-MM-DD-<feature>.md
"
```

**Branch cleanup:**
```bash
git worktree remove "$worktree_abs"
git branch -d "$feature_branch"
# Remote cleanup (if branch was pushed)
git push origin --delete "$feature_branch" 2>/dev/null || true
```

### 2. Release Skill Changes (`skills/release/phases/1-execute.md`)

**Step 9 (Commit Release Changes):**
- Remove the existing commit step — the squash merge commit in step 10 becomes the single commit
- Merge step 9 into step 10 so that version bumps, changelog, and release notes are all part of the squash merge commit

**Step 10 (Merge and Cleanup):**
- Update the merge option to use `git merge --squash`
- Add archive tag creation before merge
- Commit message uses the release notes generated in step 5

### 3. Retroactive Rewrite Script

One-time script that:
1. Collects all version tags sorted by version
2. For each version tag:
   - Gets the tree object at that tag
   - Creates a commit with that tree, parented to the previous squashed commit
   - Commit message: `Release vX.Y.Z — <title from CHANGELOG.md>`
3. Points main at the final squashed commit
4. Moves all version tags to their new squashed commits
5. Archives existing feature branches as `archive/feature/<name>` tags
6. Force pushes main + tags

### 4. CHANGELOG.md as Commit Message Source

The retroactive script reads `CHANGELOG.md` to generate commit bodies. Each version entry becomes the commit message for that version's squashed commit.

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/worktree-manager.md` | Change merge to squash merge, add archive tagging |
| `skills/release/phases/1-execute.md` | Merge commit steps 9+10, update commit message format |
| `.beastmode/context/design/architecture.md` | Update "Unified Cycle Commits" decision |
| `.beastmode/context/implement/agents.md` | Note archive tag convention |
| (one-time script) | Retroactive rewrite of main history |

## Acceptance Criteria

- [ ] `git log --oneline main` shows ~20 commits (one per version tag)
- [ ] Each commit message follows GitHub release style: `Release vX.Y.Z — Title`
- [ ] All version tags (v0.1.5 through v0.10.0) point to correct squashed commits
- [ ] `/release` skill uses `git merge --squash` instead of `git merge`
- [ ] Feature branches archived with `archive/feature/<name>` tags before deletion
- [ ] `git merge --squash` produces clean single commit on main for new releases
- [ ] Commit message body includes categorized Features/Fixes/Artifacts sections

## Testing Strategy

- Run retroactive script on a test clone first
- Verify `git log --oneline` shows expected ~20 commits
- Verify all version tags resolve to correct tree states (compare `git diff vX.Y.Z` before and after — should be empty)
- Run `/release` on next feature to verify squash merge flow end-to-end

## Deferred Ideas

- **PR-based squash merge**: For team workflows, GitHub PRs with "squash and merge" could replace local `git merge --squash`. Not needed for single-developer project.
- ~~**Automated CHANGELOG.md → commit message**: Parse CHANGELOG.md programmatically during /release instead of manual crafting. Currently the release skill already generates notes — just format them as the squash commit body.~~ (implemented: 2026-03-08)
