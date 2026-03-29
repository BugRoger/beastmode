# Label Taxonomy

## Context
GitHub issues need labels to reflect beastmode's phase and status model. Labels must be mutually exclusive within their category.

## Decision
12 labels across 4 categories: type (epic, feature), phase (backlog, design, plan, implement, validate, release, done), status (ready, in-progress, blocked), gate (awaiting-approval). Status/review was explicitly dropped. Phase and status labels are mutually exclusive — remove siblings before adding.

## Rationale
Maps directly to beastmode's 5-phase workflow plus backlog/done bookends. Three status labels cover the feature lifecycle without the ambiguity of a "review" state (validate phase handles that). Mutual exclusivity prevents stale label accumulation.

## Source
.beastmode/artifacts/plan/2026-03-28-github-phase-integration.manifest.json
