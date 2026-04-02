---
phase: release
slug: "086084"
epic: cancel-cleanup
bump: minor
---

# Release: cancel-cleanup

**Version:** v0.58.0
**Date:** 2026-04-02

## Highlights

Turns `beastmode cancel` from a status-change into a full-nuke cleanup operation. Shared module consumed by CLI, dashboard, and design-abandon — idempotent, warn-and-continue per step, `--force` flag for automation.

## Features

- Shared cancel cleanup module (`cancel-logic.ts`) with ordered cleanup: worktree, branch, archive tags, phase tags, artifacts, GitHub issue, manifest
- `--force` flag skips confirmation prompt for automated pipelines
- Dashboard and CLI both consume shared cancel module — single code path
- Idempotent: cancel twice succeeds with nothing left to clean
- Warn-and-continue: failure in one step doesn't block the rest
- Artifact matching uses epic name from manifest, falls back to identifier on re-run
- GitHub issue closed as not_planned when github.enabled and epic number present
- Research artifacts explicitly preserved

## Fixes

- Derive output.json filename from worktree name, not artifact name

## Full Changelog

- `design(cancel-cleanup)`: Full cancel cleanup design
- `plan(cancel-cleanup)`: Implementation plan for cancel-logic, force-flag, consumer-swap
- `implement(cancel-logic)`: Shared cancel cleanup module
- `implement(force-flag)`: --force flag and args extraction
- `implement(consumer-swap)`: Dashboard and CLI consume shared module
- `validate(cancel-cleanup)`: 37/37 tests pass, 10/10 design criteria met
- `fix`: derive output.json filename from worktree name, not artifact name
