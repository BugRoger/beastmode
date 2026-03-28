# Label Taxonomy

## Context
GitHub Issues need a label-based mechanism to track Epic phase lifecycle and Feature work status. Labels must be idempotent to create and mutually exclusive within their family.

## Decision
Four label families totaling 12 labels: `type/` (epic, feature), `phase/` (backlog through done — 7 labels), `status/` (ready, in-progress, blocked — 3 labels; `review` dropped per squash-at-release model), `gate/` (awaiting-approval). Created via `gh label create --force`. Mutually exclusive labels removed before setting new ones.

## Rationale
Labels are universal across all GitHub plans (unlike Issue Types which require org setup). Four families provide complete lifecycle coverage. `--force` flag makes creation idempotent. Mutual exclusion prevents invalid multi-state.

## Source
state/plan/2026-03-28-github-state-model.md
state/design/2026-03-28-github-state-model.md
state/design/2026-03-28-github-phase-integration.md
