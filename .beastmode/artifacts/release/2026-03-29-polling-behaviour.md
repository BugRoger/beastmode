---
phase: release
slug: polling-behaviour
bump: patch
---

# Release: polling-behaviour

**Bump:** patch
**Date:** 2026-03-29

## Highlights

Design and planning artifacts for the async dispatch mutex — serializing concurrent `tick()` and `rescanEpic()` calls in the watch loop. Includes housekeeping: removed stale `.beastmode-runs.json` and fixed plugin update scope in release skill.

## Docs

- Design PRD for polling-behaviour async mutex (`2026-03-29-polling-behaviour.md`)
- Plan: dispatch-mutex feature — promise-based async mutex for WatchLoop
- Plan: concurrent-dispatch-test — CI test proving mutex serialization

## Chores

- Removed stale `.beastmode-runs.json` tracking file
- Added `.beastmode-runs.json` to `.gitignore`
- Fixed `plugin update` scope from `--scope project` to `--scope user` in release checkpoint

## Full Changelog

- `f483cad` plan(polling-behaviour): checkpoint
- `646362a` design(polling-behaviour): checkpoint
- `c068c07` design(polling-behaviour): checkpoint
