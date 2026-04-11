---
phase: release
slug: f2d907
epic: fix-tree-log-rendering
bump: minor
---

# Release: fix-tree-log-rendering

**Version:** v0.113.0
**Date:** 2026-04-11

## Highlights

Fixes four dashboard tree log rendering bugs: SYSTEM routing now filters epic-scoped entries, dispatched features show correct in-progress status, tree drawing characters stay dim grey regardless of log level, and only the level label carries color while messages remain white.

## Features

- feat(feature-status): upgrade pending features to in-progress when session exists
- feat(system-routing): gate systemRef entries on !context.epic

## Fixes

- fix(tree-format): decompose warn/error to segmented coloring
- fix: pass store feature slug to generate-output stop hook
- fix: preserve collision-proof hex suffix during design slug rename

## Full Changelog

- a1040b78 design(fix-tree-log-rendering): checkpoint
- 577d9bf5 plan(fix-tree-log-rendering): checkpoint
- 50cce617 fix: preserve collision-proof hex suffix during design slug rename
- b57edad0 feat(system-routing): gate systemRef entries on !context.epic
- d158accb feat(feature-status): upgrade pending features to in-progress when session exists
- be70f8dd fix(tree-format): decompose warn/error to segmented coloring
- 96e9cd32 implement(system-routing): add tasks and report artifacts
- 74ec22b5 implement(fix-tree-log-rendering-system-routing): checkpoint
- bfdebed4 Release v0.112.0 — Remove Impl Branches
- 573b3ada fix: pass store feature slug to generate-output stop hook
- d6fe875d validate(fix-tree-log-rendering): checkpoint
