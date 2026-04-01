---
phase: release
slug: c3cc89
epic: design-cleanup
bump: patch
---

# Release: design-cleanup

**Version:** v0.57.1
**Date:** 2026-04-01

## Highlights

Design abandon cleanup: two defense layers detect when a design session ends without producing a PRD and automatically clean up orphaned worktrees, manifests, and GitHub issues. Net reduction of 260 lines across 23 files.

## Fixes

- Primary abandon gate in phase dispatcher — detects missing design output after `runInteractive()` returns, triggers cleanup sequence (worktree removal, manifest deletion, GitHub issue close)
- Secondary guard in post-dispatch — prevents `DESIGN_COMPLETED` event when no output artifact exists, blocking state machine advancement
- `store.remove()` confirmed idempotent — returns false for missing files, safe to retry

## Chores

- Added test suite for design abandon gate (both exit paths), post-dispatch guard, and manifest store remove idempotency (16 new tests, all passing)
- Net code reduction: 349 added, 609 removed across 23 files

## Full Changelog

- `560bc33` design(design-cleanup): checkpoint
- `e7c84fa` plan(design-cleanup): checkpoint
- `7fef754` plan(c3cc89): checkpoint
- `34bf451` fix(design): correct design artifact filename and output path
- `d4d3612` fix(design): update output.json slug for rename
- `e488383` plan(design-cleanup): checkpoint
- `b739202` implement(design-abandon-guard): checkpoint
- `4bca0ac` implement(design-abandon-gate): checkpoint
- `589dfc1` implement(post-dispatch-guard): checkpoint
- `95c2dfe` implement(abandon-tests): checkpoint
- `620e926` validate(design-cleanup): checkpoint
