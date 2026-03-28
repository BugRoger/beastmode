# State Authority Model

## Context
The original github-state-model design positioned GitHub as the source of truth for lifecycle status. The github-phase-integration PRD reverses this: manifest JSON is the operational authority, GitHub is a synced mirror. This needs explicit documentation because the two models directly conflict.

## Decision
Manifest JSON is the operational authority for feature lifecycle, living on the feature branch in the worktree. GitHub is updated at checkpoint boundaries as a mirror providing the global cross-design view. State files (.beastmode/state/) remain the content store for PRDs, plans, and reports. Four feature statuses: pending, in-progress, blocked, completed. GitHub failures warn and continue -- absence of `github` data is the signal, no explicit failure flag.

## Rationale
Local-first authority means the workflow never depends on network availability. GitHub provides the dashboard view across all in-flight work but is not authoritative. This reversal from the original design was driven by the warn-and-continue error model: if GitHub can fail silently, it cannot be the source of truth.

## Source
state/design/2026-03-28-github-phase-integration.md
state/plan/2026-03-28-github-phase-integration.manifest.json
