# Next Action Derivation

## Context
The pipeline and status commands need to know what action to dispatch next for each epic.

## Decision
Plan phase returns a single action with the epic slug. Implement phase returns a fan-out action listing all pending and in-progress feature slugs. Validate and release return single actions with the epic slug. Done epics (release completed) return null.

## Rationale
Fan-out at implement phase enables parallel feature dispatch. Single actions for other phases keep the dispatch model simple. Null for done epics prevents re-dispatching completed work.

## Source
.beastmode/artifacts/plan/2026-03-29-manifest-only-status-manifest-first-scanner.tasks.json
