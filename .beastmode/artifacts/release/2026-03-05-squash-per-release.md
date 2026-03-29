# Release v0.11.0

**Date:** 2026-03-05

## Highlights

Introduces squash-per-release commit architecture — each release becomes a single squashed commit on main with GitHub release style messages. Feature branch history is preserved via archive tags. Includes a one-time retroactive rewrite script to clean existing 196-commit history into ~20 version-anchored commits.

## Features

- **Squash-per-release**: `/release` skill now uses `git merge --squash` to collapse entire feature branch into one commit on main
- **Archive tagging**: Feature branch tips tagged as `archive/feature/<name>` before deletion, preserving full branch history for future reference
- **GitHub release style commits**: Commit messages follow `Release vX.Y.Z — Title` format with categorized Features/Fixes/Artifacts body sections
- **Retroactive rewrite script**: `scripts/squash-history.sh` rebuilds main as one commit per version tag with `--dry-run` safety mode

## Full Changelog

- Updated `skills/_shared/worktree-manager.md` — squash merge + archive tagging in Option 1
- Updated `skills/release/phases/1-execute.md` — removed WIP commit, reordered merge/commit steps, GitHub release style message
- Updated `.beastmode/context/design/architecture.md` — "Squash-Per-Release Commit Architecture" decision
- Updated `.beastmode/context/implement/agents.md` — archive tagging + squash merge conventions
- Created `scripts/squash-history.sh` — one-time retroactive rewrite script
