---
phase: release
slug: fix-worktree-paths
epic: fix-worktree-paths
bump: minor
---

# Release: fix-worktree-paths

**Version:** v0.102.0
**Date:** 2026-04-06

## Highlights

Fix worktree-relative paths that leaked absolute filesystem paths into sync functions and build output, plus add debug logging to sync internals for future diagnostics.

## Features

- feat(sync-debug-logging): add error logging to sync catch blocks
- feat(sync-debug-logging): add logging to syncFeature and buildArtifactsMap
- feat(sync-debug-logging): add logging to readPrdSections
- feat(output-path-sanitization): apply basename() to buildOutput design/validate/release cases

## Fixes

- fix(sync): normalize buildArtifactsMap display paths with basename + phase dir prefix
- fix(sync): normalize syncFeature plan path with basename + plan dir prefix
- fix(sync): normalize readPrdSections path with basename + design dir prefix
- fix(sync-debug-logging): fix Bun mock, restore buildArtifactsMap from prior feature

## Chores

- chore: remove unused imports (relative, isAbsolute, loadSyncRefs)

## Full Changelog

89247b1..fd7884b — 17 commits across design, plan, implement, and validate phases
