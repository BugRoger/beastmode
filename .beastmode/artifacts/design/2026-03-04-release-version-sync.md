# Release Version Sync

## Goal

Eliminate version conflicts during release merge by syncing the feature branch with main before bumping.

## Research

Problem observed during v0.3.6 release: worktree branched from v0.3.4, main had v0.3.5. Bumping to v0.3.6 in the worktree caused merge conflicts on plugin.json and marketplace.json.

## Approach

Rebase-then-bump: insert a "Sync with Main" step before version detection. Rebase picks up main's latest version, bump increments from the correct base, merge is fast-forward.

## Key Decisions

### Rebase before bump (correctness)
- Add step 2 "Sync with Main" to release 1-execute.md
- `git fetch origin main && git rebase origin/main`
- If version file conflicts during rebase, accept main's version (`--theirs`)
- Rationale: Version should always increment from main's current version, not the stale worktree base.

### Read version from plugin.json (not tags)
- Determine version from post-rebase `plugin.json`, not `git describe --tags`
- Tags may not exist on the feature branch; plugin.json is always present
- Rationale: Single source of truth for current version.

### Bump all three version files
- Add `hooks/session-start.sh` to the version bump step alongside plugin.json and marketplace.json
- Rationale: Banner was missed in the current flow, causing stale version display.

## Components

### 1-execute.md changes
- Add step 2: "Sync with Main" (rebase onto main)
- Modify step 3: Read version from plugin.json instead of tags
- Modify step 7: Add hooks/session-start.sh to version bump list
- Renumber steps (1 through 11)

### worktree-manager.md changes (optional)
- Note in merge option 1 that post-rebase merge is typically fast-forward

## Files Affected

- `skills/release/phases/1-execute.md` — add sync step, fix version detection, add hook
- `skills/_shared/worktree-manager.md` — optional note about fast-forward

## Testing Strategy

- Run /release on a feature branch that's behind main
- Verify no merge conflicts on version files
- Verify version bumps from main's current version
- Verify hooks/session-start.sh gets bumped
