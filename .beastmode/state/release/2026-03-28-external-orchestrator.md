# Release: external-orchestrator

**Version:** v0.22.0
**Date:** 2026-03-28

## Highlights

Extracts worktree management and phase transitions into an external orchestrator (Justfile + WorktreeCreate hook), turning skills into pure content processors. Each phase is now a separate `claude` invocation with no auto-chaining.

## Features

- **Justfile orchestrator** — Thin CLI shell with recipes for each phase (`just design`, `just plan`, `just implement`, `just validate`, `just release`). Each recipe invokes `claude --worktree` interactively.
- **WorktreeCreate hook** — Smart branch detection: if `feature/<slug>` exists, branch from it; otherwise fall through to default `origin/HEAD` behavior.
- **Skill purification** — Removed all worktree creation/entry/assertion logic and phase transition gates from every skill. Skills now assume they're running in the correct directory.
- **Checkpoint handoff** — All 5 phase checkpoints now print `just <next-phase> <slug>` instead of auto-chaining via `Skill()` calls.
- **Commit-per-phase strategy** — Each phase commits to the feature branch at checkpoint. Release squash-merges to main.

## Chores

- Removed `transitions` section from `.beastmode/config.yaml`
- Updated 8 context/design docs to reflect external orchestrator model
- Cleaned worktree-manager.md down to reference-only merge options

## Full Changelog

- `7a24da3` validate(external-orchestrator): checkpoint
