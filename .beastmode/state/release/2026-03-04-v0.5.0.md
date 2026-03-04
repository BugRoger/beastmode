# Release v0.5.0

**Date:** 2026-03-04

## Highlights

Adds parallel wave dispatch support to /implement. Plans now analyze file isolation per wave and mark safe waves with `Parallel-safe: true`. Sequential dispatch remains the default — parallel unlocks only when both /plan and /implement verify no file overlaps.

## Features

- File isolation analysis in /plan validate phase — detects file overlap, auto-resequences conflicting tasks into separate waves
- Parallel dispatch path in /implement execute — spawns agents concurrently with `run_in_background` when wave is certified parallel-safe
- Parallel-safe flag documentation in task-format reference
- Sequential-fallback deviation type in deviation-rules

## Full Changelog

- feat(plan): add file isolation analysis to validate phase
- feat(implement): add parallel dispatch path with sequential fallback
- feat(plan): document Parallel-safe flag in task-format reference
- feat(implement): add parallel-fallback to deviation rules
