# Machine Architecture

## Context
The pipeline orchestrator previously used imperative code with scattered state transitions across multiple modules. Replacing it with declarative XState machines makes the state chart visible in one place.

## Decision
Two machines: `epicMachine` with 7 states (design, plan, implement, validate, release, done, cancelled) handling the full pipeline lifecycle with side effects, and `featureMachine` with 4 states (pending, in-progress, completed, blocked) for pure status tracking. Both use the XState v5 `setup()` API. Terminal states use `type: "final"`. CANCEL is valid from all non-terminal epic states, targeting cancelled with markCancelled + persist actions.

## Rationale
Separating epic and feature machines keeps the feature lifecycle clean — no side effects, no services, just status transitions. The epic machine owns all I/O coordination. The setup() API is required for XState v5 type inference and ensures guards/actions/actors are registered before machine creation.

## Source
.beastmode/artifacts/implement/2026-03-31-xstate-pipeline-machine-machine-definition.md
