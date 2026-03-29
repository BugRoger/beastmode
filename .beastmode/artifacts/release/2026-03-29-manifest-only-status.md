# Release: manifest-only-status

**Version:** v0.34.0
**Date:** 2026-03-29

## Highlights

Status table pivoted from design-file discovery (116 noisy rows) to manifest-first discovery (~12 active epics). Watch loop converged onto the canonical scanner. Dead code removed.

## Features

- **Manifest-first scanner** — Epic discovery pivots on manifest files instead of design files. Pipeline manifests take precedence over plan manifests. Removed MANIFEST_EPOCH, hasPhaseMarker, hasLegacyArtifact, dateFromDesign, readRunLog, aggregateCost, and costUsd from EpicState.
- **Status cleanup** — Removed Cost column (never had data), readRunLog, formatCost. Last Activity uses manifest.lastUpdated. Table simplified to 5 columns: Epic, Phase, Progress, Blocked, Last Activity.
- **Watch convergence** — Deleted scanEpicsInline() from watch-command.ts. Watch loop delegates directly to the canonical state-scanner.scanEpics() with no inline fallback.

## Full Changelog

- `fc4aace` design(manifest-only-status): checkpoint
- `08e15eb` plan(manifest-only-status): checkpoint
- `e1c6810` implement(manifest-only-status): checkpoint
- `777202f` implement(manifest-only-status): checkpoint
- `2d5b736` validate(manifest-only-status): checkpoint
