# Release Skill: Restore Rich Functionality

## Goal

Restore the detailed release logic removed in commit `ff2184a` — version detection, commit categorization, changelog generation, interactive merge options, git tagging, and plugin version bumping — into the standardized `0-prime → 1-execute → 2-validate → 3-checkpoint` anatomy.

## Approach

Hybrid restoration: keep the 0-3 phase structure but fill each phase with the full logic from the old `1-analyze → 2-generate → 3-publish` phases. The key move: interactive merge options and git tagging belong in **Phase 1** (execute), not Phase 3.

## Key Decisions

**Merge options in Phase 1, not Phase 3**
Executing the merge/PR is part of the release action, not cleanup. Phase 3 should be retro-only.

**Artifacts to `.beastmode/state/release/`**
Aligns with the new L0/L1/L2 knowledge architecture migrated in `2e41b82`.

**Plugin file updates automated**
Both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are bumped via Read/Edit tools within Phase 1 before the unified commit.

**Version detection as default, manual override supported**
Parse commits for conventional prefixes; ask user if ambiguous.

## Component Breakdown

### Phase 0: Prime
- Load `.beastmode/context/RELEASE.md` + `.beastmode/meta/RELEASE.md`
- Read status file → extract worktree path/branch
- Enter worktree: `cd <worktree_path>`
- **Version determination:**
  - `git describe --tags --abbrev=0` → find last tag
  - `git log <last-tag>..HEAD --oneline` → list commits
  - Detect: any `BREAKING CHANGE` → major; any `feat:` → minor; otherwise → patch
  - Present suggested version, allow override

### Phase 1: Execute
- **Commit categorization:** parse conventional commits into groups:
  - Breaking Changes, Features, Fixes, Docs, Chores
- **Generate release notes** → `.beastmode/state/release/YYYY-MM-DD-vX.Y.Z.md`:
  ```markdown
  # Release vX.Y.Z
  **Date:** YYYY-MM-DD
  ## Highlights
  ## Breaking Changes
  ## Features
  ## Fixes
  ## Full Changelog
  ```
- **Update CHANGELOG.md** if present — prepend new section
- **Bump plugin version files:**
  - `.claude-plugin/plugin.json` → `"version": "X.Y.Z"`
  - `.claude-plugin/marketplace.json` → `"version": "X.Y.Z"`
- **Stage all:** `git add -A`
- **Unified commit:** `feat(release): vX.Y.Z` with cycle artifact references
- **Interactive merge options** (AskUserQuestion):
  - Option 1: Merge locally → `git checkout main && git merge <branch> && git worktree remove && git branch -d`
  - Option 2: Push + create PR → `git push -u origin <branch>` + `gh pr create` with formatted body
  - Option 3: Keep as-is → print manual commands
  - Option 4: Discard → require typed confirmation, force cleanup
- **Git tagging:**
  - `git tag -a vX.Y.Z -m "Release X.Y.Z"`
  - Suggest: `git push origin vX.Y.Z`
- **Plugin marketplace update** suggestions:
  - `claude plugin marketplace update`
  - `claude plugin update beastmode@beastmode-marketplace --scope project`

### Phase 2: Validate
- Verify release notes file created in `.beastmode/state/release/`
- Verify CHANGELOG.md updated (if exists)
- Verify plugin version files bumped
- Verify unified commit created
- Gate: stop if any check fails

### Phase 3: Checkpoint
- Update `.beastmode/meta/RELEASE.md` with cycle learnings
- Mark feature released in status file (remove worktree section if merged)
- Session tracking + context report

## Testing Strategy

Manual verification:
1. Run `/release` on a branch with mixed conventional commits
2. Confirm version suggestion matches commit types
3. Confirm release notes saved to `.beastmode/state/release/`
4. Confirm CHANGELOG.md prepended correctly
5. Confirm plugin.json and marketplace.json version bumped
6. Confirm merge options presented and each path executes correctly
7. Confirm git tag created
