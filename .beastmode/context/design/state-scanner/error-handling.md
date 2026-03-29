## Context
Scanner errors in the watch loop need to be handled without crashing the pipeline or losing visibility into epic state.

## Decision
Scanner errors skip the tick and retry on next poll. No retry limit — infinite retry with logging. Missing/empty pipeline dirs return empty array. Slug collisions log warning to stderr and use newest manifest. Manifests with missing phase field are strictly rejected — skipped entirely, visible only with --verbose.

## Rationale
Infinite retry with logging lets the human see the problem and intervene. Graceful degradation for edge cases (empty dirs, missing fields, collisions) prevents cascading failures.

## Source
.beastmode/state/design/2026-03-29-bulletproof-state-scanner.md
