---
phase: release
slug: polling-behaviour
bump: minor
---

# Release: polling-behaviour

**Version:** v0.43.0
**Date:** 2026-03-29

## Highlights

Rewrites the watch loop's state reconciliation so the orchestrator is the sole writer of pipeline state. Replaces the output.json-based approach with direct worktree file scanning — plan files are scanned from disk, features are marked inline, and phase advancement follows an explicit map. Removes dead code paths and stale tests that depended on the old model.

## Features

- Orchestrator-driven state reconciliation in `watch-command.ts` — plan scanning, feature marking, and phase advancement all happen directly instead of parsing output.json
- Explicit `NEXT_PHASE` advancement map for phase transitions
- Plan reconciliation scans worktree for feature plan `.md` files and enriches the manifest automatically
- Copies plan files from worktree to git-tracked `artifacts/plan/` for downstream agents

## Chores

- Removed `findWorktreeOutputFile` and `loadWorktreePhaseOutput` from `phase-output.ts`
- Removed `shouldAdvance` / `regressPhase` imports from watch-command
- Removed stale release re-dispatch test from `watch.test.ts`
- Cleaned up `manifest-store.ts` (removed unused exports), `post-dispatch.ts`, and associated test files
- Removed stale `.beastmode-runs.json` tracking file, added to `.gitignore`
- Fixed plugin update scope from `--scope project` to `--scope user` in release checkpoint

## Full Changelog

- `a17dd6d` release(polling-behaviour): checkpoint
- `3fb21c8` release(polling-behaviour): checkpoint
- `93af52a` release(polling-behaviour): checkpoint
- `f483cad` plan(polling-behaviour): checkpoint
- `646362a` design(polling-behaviour): checkpoint
- `c068c07` design(polling-behaviour): checkpoint
