# Commit Sequence

## Context
Release requires coordinating version bumps, retro, and merge into a specific order to avoid conflicts and ensure completeness. With external orchestration, each phase commits to the feature branch at checkpoint, so release squash-merges accumulated per-phase commits into one clean main commit.

## Decision
Each phase commits its work to the feature branch at checkpoint. Execute preps versions (plugin.json/marketplace.json/session-start.sh) and L0 proposal. Checkpoint runs retro (while still in worktree), then squash-merges to main, commits, tags, and updates marketplace. Per-phase commits on the feature branch collapse to one commit on main at release. GitHub release style commit messages.

## Rationale
- Commit-per-phase ensures work persists across ephemeral per-session worktrees
- Feature branches serve as durable handoff between sessions — worktrees are disposable
- Squash merge at release still produces one commit per version on main — clean history preserved
- Retro before merge ensures meta/context changes are included in the release commit

## Source
state/design/2026-03-04-release-retro-commit.md
state/design/2026-03-01-unified-cycle-commit.md
state/design/2026-03-08-retro-quick-exit.md
state/design/2026-03-28-external-orchestrator.md
