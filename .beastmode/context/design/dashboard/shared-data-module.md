# Shared Data Module

## Context
Dashboard and status command both need the same data logic (sorting epics by phase, filtering, building snapshots, detecting changes). Duplicating this logic creates a maintenance burden.

## Decision
Extract data-only pure functions from status.ts into a shared `status-data.ts` module. Dashboard uses Ink components for rendering. status.ts keeps its ANSI string rendering untouched.

## Rationale
Clean separation of data layer (shared) from presentation layer (command-specific). Pure functions are easy to unit test independently. status.ts modifications are minimal — re-exports from the shared module maintain backward compatibility.

## Source
.beastmode/artifacts/design/2026-03-31-fullscreen-dashboard.md
.beastmode/artifacts/implement/2026-03-31-fullscreen-dashboard-shared-data-extract.md
