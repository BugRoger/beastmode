# Feature State Machine

## Context
Features are implementable work units within an Epic. Local manifest and GitHub labels need aligned but distinct status models.

## Decision
Manifest tracks four feature statuses: pending, in-progress, blocked, completed. GitHub labels track three statuses: status/ready, status/in-progress, status/blocked (status/review dropped — no per-feature PRs in beastmode's squash-at-release model). Feature closure on GitHub triggers roll-up check on parent Epic.

## Rationale
Manifest needs a terminal state (completed) that GitHub handles via issue closure. Dropping status/review aligns with squash-at-release model where no per-feature PRs exist. Roll-up from Feature closure to Epic advancement is handled at checkpoint, not by GitHub automation.

## Source
.beastmode/artifacts/design/2026-03-28-github-state-model.md
.beastmode/artifacts/design/2026-03-28-github-phase-integration.md
