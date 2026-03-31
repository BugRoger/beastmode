# Assign Separation Pattern

## Context
XState v5.30 changed how `assign()` interacts with TypeScript type inference. Placing assign() inline in state transitions breaks type narrowing for context and event parameters.

## Decision
All `assign()` calls live inside `setup({ actions: { ... } })`. The actual logic is extracted into pure compute functions in `actions.ts` (e.g., `computeSetFeatures`, `computeResetFeatures`). The `assign()` wrapper calls the compute function and appends `lastUpdated` timestamp. Side-effect actions like `persist` are stubs — consumers provide real implementations.

## Rationale
This was an auto-fix deviation discovered during implementation. XState v5.30 requires assign() inside setup() for proper type inference with actors. Extracting compute functions keeps actions.ts unit-testable without XState machinery.

## Source
.beastmode/artifacts/implement/2026-03-31-xstate-pipeline-machine-machine-definition.md
