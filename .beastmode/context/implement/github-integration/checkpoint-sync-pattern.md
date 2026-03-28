# Checkpoint Sync Pattern

## Context
GitHub state needs to stay in sync with local phase progression without adding complexity to the core workflow.

## Decision
Add a single "Sync GitHub" step to each phase checkpoint, positioned between artifact-save and retro. Each checkpoint performs phase-appropriate operations (create, advance, close). Design creates the Epic, plan creates feature sub-issues, implement manages in-progress/completion, validate and release advance/close.

## Rationale
Checkpoint boundaries are natural sync points — the local state has just been committed, so GitHub gets a consistent snapshot. One step per checkpoint keeps the pattern uniform and auditable.

## Source
.beastmode/state/plan/2026-03-28-github-phase-integration.manifest.json
