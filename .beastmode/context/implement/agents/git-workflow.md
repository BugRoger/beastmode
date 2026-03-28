# Git Workflow

## Context
Implementation generates commits that need to be managed across worktrees and merged at release.

## Decision
Commit naturally during implementation (don't batch). Never push to main directly — release handles squash merge. Use `feature/<feature>` branch naming. Discover worktrees via `.beastmode/worktrees/`.

## Rationale
Natural commits preserve granular history for debugging. Release-owned squash merge keeps main clean. Convention-based branch naming enables automated discovery.

## Source
Source artifact unknown — backfill needed
