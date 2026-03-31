# Guards

## Context
Transition guards prevent invalid state transitions (e.g., moving to implement without features).

## Decision
Guards are standalone exported functions in `guards.ts`, registered by name in `setup({ guards })`. They check event payloads and context directly. Three guards: `hasFeatures`, `allFeaturesCompleted`, `outputCompleted`.

## Rationale
Standalone functions are independently testable. Event-driven guard logic means the caller is responsible for sending events only when preconditions are met externally.

## Source
.beastmode/artifacts/implement/2026-03-31-xstate-pipeline-machine-machine-definition.md
