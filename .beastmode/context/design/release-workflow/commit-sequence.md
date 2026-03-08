# Commit Sequence

## Context
Release requires coordinating version bumps, retro, and merge into a specific order to avoid conflicts and ensure completeness. Release was originally an exception with retro in execute; normalized to match all other phases.

## Decision
Execute preps versions (plugin.json/marketplace.json/session-start.sh) and L0 proposal. Checkpoint runs retro (while still in worktree), then squash-merges to main, commits, tags, and updates marketplace. No interim commits during feature work — all commits deferred to release. GitHub release style commit messages.

## Rationale
- Retro in checkpoint normalizes release to match all other phases (design, plan, implement, validate)
- Retro before merge ensures meta/context changes are included in the release commit
- No interim commits keeps the worktree clean and the main branch linear
- Squash merge produces one commit per version on main

## Source
state/design/2026-03-04-release-retro-commit.md
state/design/2026-03-01-unified-cycle-commit.md
state/design/2026-03-08-retro-quick-exit.md
