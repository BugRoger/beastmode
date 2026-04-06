---
phase: release
slug: 7c2042
epic: details-panel-stats
bump: minor
---

# Release: details-panel-stats

**Bump:** minor
**Date:** 2026-04-06

## Highlights

Adds real-time session statistics to the details panel — token counts, cost tracking, duration, and request metrics accumulate live via event-driven architecture and render inline in the existing panel component.

## Features

- Add SessionStatsAccumulator with unit tests — event-driven stats collection from watch loop
- Add stats content variant to DetailsPanel type system
- Add duration formatting utility for human-readable elapsed time
- Add session stats accumulator core module
- Add stats rendering to DetailsPanel component
- Wire stats accumulator into App component lifecycle

## Fixes

- Resolve TypeScript errors (unused imports, add dispose method)

## Full Changelog

- `feat(stats-panel): wire stats accumulator into App component`
- `feat(stats-panel): add stats rendering to DetailsPanel`
- `feat(session-stats): add SessionStatsAccumulator with unit tests`
- `feat(stats-panel): add stats content variant to type system`
- `feat(stats-panel): add duration formatting utility`
- `feat(stats-panel): add session stats accumulator`
- `fix(stats-panel): resolve TypeScript errors (unused imports, add dispose)`
- `test(session-stats): add dispose() method tests for event listener cleanup`
- `test(stats-panel): add BDD integration test (RED)`
- `test(session-stats): add BDD integration test (RED state)`
