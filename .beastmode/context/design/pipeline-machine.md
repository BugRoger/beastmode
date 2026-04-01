# Pipeline Machine

XState v5 state machine module replacing implicit manifest.ts pure functions with explicit declarative state definitions. Two machines: epic pipeline (design → plan → implement → validate → release → done/cancelled) and feature status (pending → in-progress → completed/blocked).

## Library Choice

### Decision
XState v5 with `setup()` API. `setup()` enforces completeness at construction time — all actions, guards, and services must be provided when the machine is created, unlike `provide()` which allows runtime gaps.

### Rationale
Research evaluated XState v5, Robot3, ts-fsm, TypeState, and DIY. XState v5 is the only actively maintained library with full state-level hooks (onEnter/onExit), named guards, invoked async services, and clean definition/implementation separation. Robot3 lacks state-level hooks. Others are abandoned. DIY would reimplement most of XState for this complexity level (7 states, conditional transitions, async services).

### Source
.beastmode/artifacts/research/2026-03-31-ts-state-machine-libraries.md
.beastmode/artifacts/design/2026-03-31-xstate-pipeline-machine.md

## Architecture

### Decision
Domain module at `cli/src/pipeline-machine/` with: `epic.ts` (epic machine definition), `feature.ts` (feature machine definition), `actions.ts` (sync action implementations — persist, rename, enrich), `guards.ts` (named guard implementations — hasFeatures, allFeaturesCompleted, outputCompleted), `services.ts` (async service implementations — GitHub sync), `types.ts` (EpicContext, EpicEvent, FeatureContext, FeatureEvent), `index.ts` (public API). Tests in `__tests__/` subdirectory.

### Rationale
Domain module groups all state machine concerns. Separate files for actions, guards, services enforce the separation of machine definition from business logic — the core design goal. `manifest-store.ts` remains as-is (clean filesystem boundary).

### Source
.beastmode/artifacts/design/2026-03-31-xstate-pipeline-machine.md

## Side Effect Model

### Decision
Sync side effects (persist, enrich, rename slug, reset features) are XState actions on transitions. Async side effects (GitHub sync) are XState invoked services. `post-dispatch.ts` becomes a thin event router: loads output, determines event type, sends typed event to actor.

### Rationale
Actions guarantee ordering (persist before GitHub sync reads state). Invoked services handle async lifecycle (start, success, failure) without manual error handling. Thin event router eliminates business logic from orchestration code.

### Source
.beastmode/artifacts/design/2026-03-31-xstate-pipeline-machine.md

## Watch Loop Integration

### Decision
State metadata (`meta`) on each state node declares dispatch type (single, fan-out, skip). Watch loop reads `actor.getSnapshot().getMeta()`. Feature list for fan-out derived from context. `deriveNextAction()` deleted — machine is the sole dispatch authority.

### Rationale
Dispatch semantics are inherent to the state, not derived by external logic. State metadata is the single source of truth — no separate function that can drift from the machine definition.

### Source
.beastmode/artifacts/design/2026-03-31-xstate-pipeline-machine.md

## Persistence

### Decision
Same `.manifest.json` format. Machine context IS the PipelineManifest shape. Persist action accumulates state changes in memory only — no disk writes during machine transitions. Single `store.save()` at end of post-dispatch writes the final state to disk. Load creates actor with context from disk. No migration needed for existing manifests. `store.save()` is a pure write operation with no rename detection or file manipulation beyond writing the manifest. `store.rename()` updates manifest fields in memory without persisting.

### Rationale
Manifests are read by status command, watch loop, scanner, and potentially external tooling. Coupling storage format to XState's internal snapshot structure would break all consumers and require migration. Memory-only persist during machine transitions eliminates multiple disk writes per dispatch (previously 5+ per dispatch) and prevents mid-transaction state divergence. Single write path means no `skipFinalPersist` coordination flag needed.

### Source
.beastmode/artifacts/design/2026-03-31-xstate-pipeline-machine.md

context/design/pipeline-machine/
