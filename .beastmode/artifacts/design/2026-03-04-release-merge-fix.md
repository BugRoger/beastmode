# Design: Release Merge Fix

**Date:** 2026-03-04
**Feature:** `feature/release-merge-fix`

## Goal

Eliminate the constant merge conflicts in the /release phase by simplifying the merge strategy and reducing version file sprawl.

## Approach

Two changes: (1) drop the rebase step and use merge-only, so conflicts resolve once instead of twice, and (2) remove hardcoded version strings from README.md and PRODUCT.md, reducing conflict surface from 5 files to 3.

## Key Decisions

### Locked Decisions

- **Merge-only strategy**: Drop `git rebase origin/main` from release step 2. Replace with a simple `git merge feature/<feature>` on main. Conflicts happen once at merge time.
- **Drop README version badge**: Remove the hardcoded `version-X.Y.Z-blue` shield badge from README.md entirely. Version is in plugin.json and CHANGELOG.md.
- **Drop PRODUCT.md version**: Remove the `## Current Version` section from PRODUCT.md. Version info lives in plugin.json.
- **Keep 3 version files**: plugin.json (source of truth), marketplace.json (required by marketplace), session-start.sh (runtime banner).
- **Update /release conflict docs**: Expand conflict resolution instructions to cover all 3 remaining files with simple strategy.

### Claude's Discretion

- Exact wording of conflict resolution instructions in release skill
- Whether to add a version-reading helper to session-start.sh or keep it hardcoded

## Components

1. **Release execute phase** (`skills/release/phases/1-execute.md`) — Remove rebase step, simplify merge step
2. **Worktree manager** (`skills/_shared/worktree-manager.md`) — Update merge option to remove fast-forward note
3. **README.md** — Remove version badge line
4. **PRODUCT.md** — Remove `## Current Version` section
5. **Release execute step 7** — Remove README.md and PRODUCT.md from version bump list
6. **Release meta** — Update meta learning about version conflicts

## Files Affected

| File | Action |
|------|--------|
| `skills/release/phases/1-execute.md` | Remove rebase step, update merge step, trim version bump list |
| `skills/_shared/worktree-manager.md` | Remove fast-forward note from merge option |
| `README.md` | Remove version badge |
| `.beastmode/PRODUCT.md` | Remove `## Current Version` section |
| `.beastmode/meta/RELEASE.md` | Update learnings |

## Acceptance Criteria

- [ ] Release execute phase has no `git rebase` command
- [ ] Merge step uses `git merge` without `--ff-only`
- [ ] README.md has no hardcoded version badge
- [ ] PRODUCT.md has no `## Current Version` section
- [ ] Version bump list in release step 7 only mentions plugin.json, marketplace.json, session-start.sh
- [ ] Worktree manager merge option has no fast-forward note

## Testing Strategy

Visual review of modified skill files. Next /release cycle verifies zero-conflict merge.

## Deferred Ideas

- ~~session-start.sh could read version from plugin.json at runtime instead of hardcoding (reduces to 2 version files)~~ (implemented: 2026-03-08)
- CHANGELOG.md could auto-generate version badge for README via CI
