# Release: epics-only-board

**Version:** v0.27.0
**Date:** 2026-03-28

## Highlights

Only Epics appear on the Projects V2 board. Feature issues removed from all checkpoint board-add operations and cleaned off the existing board, giving a clean lifecycle view without implementation-level noise.

## Features

- **Epics-only board model** — Removed `gh project item-add` calls for Feature issues from plan checkpoint, implement prime, and implement checkpoint; only Epics are added to the Projects V2 board
- **Existing feature cleanup** — Removed all existing Feature issues from the project board via `deleteProjectV2Item` GraphQL mutation (one-time ad-hoc cleanup)
- **Context doc updates** — `github-state-model.md` gains NEVER rule for Feature board-add; `DESIGN.md` summary updated to reflect epics-only model

## Chores

- Reverted TypeScript CLI orchestrator design/plan/release artifacts (superseded by Justfile + CronCreate architecture)
- Updated orchestration and phase-transition context docs to reflect current architecture
- Cleaned up stale CLI-related context and meta docs

## Full Changelog

- `a00acb0` plan(epics-only-board): checkpoint
- `04fef25` implement(skip-feature-board-add): checkpoint
- `47c4ad8` implement(cleanup-existing-board-features): mark completed
- `ea0a6be` validate(epics-only-board): checkpoint
