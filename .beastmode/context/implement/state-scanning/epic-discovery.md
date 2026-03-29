# Epic Discovery

## Context
The CLI needs to find all active epics to display status and determine next actions. Previously discovery relied on design files and date-based heuristics.

## Decision
Pivot epic discovery entirely on manifest files. Scan state/plan/ directory for dated manifest files and pipeline/ directory for nested or flat manifests. Pipeline entries win dedup over plan entries. Extract slug by stripping date prefix and .manifest.json suffix.

## Rationale
Manifests are the single source of truth for epic state. Design files may not exist (e.g., epics created via pipeline). Date heuristics and legacy code (MANIFEST_EPOCH, dateFromDesign, hasPhaseMarker, hasLegacyArtifact, readRunLog, aggregateCost, findManifest) were dead weight that coupled discovery to filesystem conventions instead of structured data.

## Source
.beastmode/artifacts/plan/2026-03-29-manifest-only-status-manifest-first-scanner.tasks.json
