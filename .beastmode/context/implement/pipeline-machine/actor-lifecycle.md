# Actor Lifecycle

## Context
Consumers need to create epic actors for new pipelines and restore them from persisted state across process restarts.

## Decision
Two factory functions: `createEpicActor(context)` for fresh starts and `loadEpic(snapshot, context)` for snapshot restoration. Both call `createActor()` and immediately `.start()`. Event type constants exported as `EPIC_EVENTS` and `FEATURE_EVENTS`.

## Rationale
Immediate start matches the pipeline's always-running model. Snapshot restoration enables persistence across CLI restarts without replaying event history.

## Source
.beastmode/artifacts/implement/2026-03-31-xstate-pipeline-machine-machine-definition.md
