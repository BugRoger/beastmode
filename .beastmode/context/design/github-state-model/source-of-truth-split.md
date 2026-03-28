# Source of Truth Split

## Context
Beastmode needs a clear authority model for feature lifecycle state. The original design positioned GitHub as the status authority, but network dependency and local-first workflows demand a local-first model.

## Decision
Manifest JSON is the operational authority for feature lifecycle (per-branch, per-worktree). GitHub is a synced mirror updated at checkpoint boundaries when github.enabled is true. Repo files own content (design docs, plans, validation reports). Issue bodies link to repo artifacts via relative paths.

## Rationale
Local manifest ensures workflow never depends on network connectivity. GitHub provides the global view across designs but is not required for individual feature work. Checkpoint-boundary syncing keeps the sync surface small and predictable.

## Source
.beastmode/state/design/2026-03-28-github-state-model.md
.beastmode/state/design/2026-03-28-github-phase-integration.md
