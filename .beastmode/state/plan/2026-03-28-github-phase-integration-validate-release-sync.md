# Validate and Release Sync

**Design:** .beastmode/state/design/2026-03-28-github-phase-integration.md
**Architectural Decisions:** see manifest

## User Stories

5. As a developer, I want `/validate` checkpoint to (when GitHub is enabled) advance the Epic to phase/validate, so that the pipeline phase is reflected on the board.
6. As a developer, I want `/release` checkpoint to (when GitHub is enabled) advance the Epic to phase/done and close it, so that completed work is archived on the board.

## What to Build

**Validate checkpoint:**
Add a "Sync GitHub" step between "Save Report" and "Phase Retro". When `github.enabled` is true and the manifest has a `github.epic`:
- Advance Epic's phase label to `phase/validate` (if not already set by implement's roll-up check)
- This is a safety net — implement may have already advanced to validate if all features completed, but validate checkpoint confirms it

**Release checkpoint:**
Add a "Sync GitHub" step between "Phase Retro" and "Squash Merge to Main". This is a special case — release checkpoint operates partly in the worktree and partly on main. The GitHub sync should happen while still in the worktree (before the transition boundary marker).

When `github.enabled` is true and the manifest has a `github.epic`:
- Advance Epic's phase label to `phase/done`
- Close the Epic issue

Both steps read the manifest from the worktree to get the Epic issue number. Both use the shared GitHub utility's label operations.

## Acceptance Criteria

- [ ] Validate checkpoint advances Epic to phase/validate when github.enabled
- [ ] Release checkpoint advances Epic to phase/done and closes it when github.enabled
- [ ] Both steps read manifest for Epic number — no hardcoded issue references
- [ ] Both steps skip silently when github.enabled is false
- [ ] Both steps warn and continue on GitHub API failure
