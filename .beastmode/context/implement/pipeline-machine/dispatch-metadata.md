# Dispatch Metadata

## Context
The watch loop previously used a separate `deriveNextAction()` function to determine what to do in each state, creating a parallel source of truth.

## Decision
Each state node declares `meta: { dispatchType }` where dispatchType is "single", "fan-out", or "skip". Mapping: design/plan/validate/release = single, implement = fan-out, done/cancelled = skip.

## Rationale
Single source of truth. The state definition and its dispatch behavior live in the same place.

## Source
.beastmode/artifacts/implement/2026-03-31-xstate-pipeline-machine-machine-definition.md
