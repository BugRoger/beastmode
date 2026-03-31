---
phase: design
slug: xstate-pipeline-machine
---

## Problem Statement

The pipeline state machine is implicit — pure functions in `manifest.ts` with hardcoded conditionals in `shouldAdvance()`, business logic (GitHub sync, slug rename, worktree cleanup) entangled in `post-dispatch.ts`, and no formal state chart. Transitions, guards, and side effects are scattered across modules. The `deriveNextAction()` function duplicates knowledge that should live in the state definition. There is no way to hook into transitions declaratively, and the relationship between states is only visible by reading imperative code.

## Solution

Extract an explicit XState v5 state machine into a `cli/src/pipeline-machine/` domain module. Two machines: an epic pipeline machine (design → plan → implement → validate → release → done/cancelled) and a feature status machine (pending → in-progress → completed/blocked). Use the `setup()` API for type-safe separation of machine definition from business logic implementation. Actions handle synchronous side effects (persist, enrich, rename), invoked services handle async operations (GitHub sync). State metadata declares dispatch semantics for the watch loop. Same `.manifest.json` format for backward compatibility. Test-first migration: prove both machines with comprehensive tests before swapping any consumers.

## User Stories

1. As a developer, I want the pipeline states and transitions defined declaratively in one place, so that I can see the full state chart without reading imperative code across multiple files.
2. As a developer, I want transition guards (e.g., "advance from plan only if features exist") named and separated from the machine definition, so that I can test them independently.
3. As a developer, I want to hook side effects (persist, GitHub sync, slug rename) into specific transitions declaratively, so that business logic is attached to transitions rather than scattered in orchestration code.
4. As a developer, I want the watch loop to read dispatch instructions from state metadata rather than a separate `deriveNextAction()` function, so there's a single source of truth for what each state means.
5. As a developer, I want the feature status machine modeled separately from the epic machine, so that feature lifecycle has its own clean transition rules.
6. As a developer, I want comprehensive tests for all transitions, guards, actions, persistence round-trips, and integration flows before any consumer is changed, so that the refactor doesn't break the pipeline.
7. As a developer, I want existing `.manifest.json` files to work without migration, so that in-flight epics are unaffected.
8. As a developer, I want `post-dispatch.ts` reduced to a thin event router that sends events to the machine, so that orchestration logic lives in the machine definition.

## Implementation Decisions

### Library: XState v5 with `setup()` API
- `setup()` enforces completeness at construction time (vs `provide()` which allows runtime gaps)
- ~14 kB gzipped, acceptable for CLI tool
- Actor model supports persistence via `getSnapshot()`/`createActor(machine, { snapshot })`

### Two machines
- **Epic machine**: 7 states (design, plan, implement, validate, release, done, cancelled)
- **Feature machine**: 4 states (pending, in-progress, completed, blocked)
- Separate concerns, separate test suites

### Side effects as XState actions + services
- **Sync actions**: persist (store.save), enrichManifest, renameSlug, setFeatures, resetFeatures, markCancelled
- **Async services (invoke)**: syncGitHub — async, can fail without blocking, XState manages lifecycle
- `post-dispatch.ts` becomes a thin event sender: load output → determine event type → send to actor

### Named guards in `setup()`
- `hasFeatures`: plan → implement only if output contains features
- `allFeaturesCompleted`: implement → validate only if every feature status is "completed"
- `outputCompleted`: validate → release and release → done only if output.status === "completed"

### State metadata for watch loop dispatch
- Each state node declares `meta: { dispatchType: 'single' | 'fan-out' | 'skip' }`
- Watch loop reads `actor.getSnapshot().getMeta()` for dispatch type
- Feature list for fan-out derived from context: `context.features.filter(f => f.status !== 'completed')`
- `deriveNextAction()` deleted — machine is the sole authority

### Human gates stay external
- Machine is pure phase progression
- Watch loop checks `config.yaml` gates before sending events
- Gates are policy, not state

### Slug rename as transition action
- `DESIGN_COMPLETED` event carries `{ realSlug }` payload
- Action on design → plan transition: updates context.slug + renames manifest file on disk

### Cancel as direct transition
- `CANCEL` event valid from any non-terminal state
- Transition actions: markCancelled + persist (sync)
- GitHub close as invoked service (async, warn-and-continue)

### Validate regression as explicit transition
- `VALIDATE_FAILED` event triggers implement ← validate
- `resetFeatures` action sets all features to "pending"
- Explicit in the state chart, not hidden in post-dispatch conditionals

### Same `.manifest.json` format
- Machine context IS the PipelineManifest shape
- Persist action writes `context` to disk via `store.save()`
- Load creates actor with `context` from disk
- No migration needed for existing manifests

### Module structure
```
cli/src/pipeline-machine/
├── index.ts           # Public API: createEpicActor, loadEpic, events
├── epic.ts            # Epic machine definition
├── feature.ts         # Feature machine definition
├── actions.ts         # Action implementations (persist, rename, enrich)
├── guards.ts          # Guard implementations
├── services.ts        # Async services (GitHub sync)
├── types.ts           # EpicContext, EpicEvent, FeatureContext, etc.
└── __tests__/
    ├── epic.test.ts           # All transitions, guards, actions
    ├── feature.test.ts        # Feature status transitions
    ├── persistence.test.ts    # Snapshot round-trip
    └── integration.test.ts    # Full post-dispatch flow through machine
```

### Test-first migration
- Phase 1: Build `pipeline-machine/` module + comprehensive tests
- Phase 2: Verify all tests green
- Phase 3: Swap consumers (post-dispatch, watch, commands)
- Phase 4: Delete old `manifest.ts` pure functions that are replaced

## Testing Decisions

Five test categories, all written before any consumer is changed:

1. **All valid transitions**: Every state can reach every valid next state. Terminal states reject all events. No impossible transitions exist.
2. **Guard conditions**: Each guard blocks when condition is false, allows when true. Edge cases (empty features, partial completion).
3. **Actions and services**: Persist fires on every transition. GitHub sync service invoked at correct points. Feature reset on regression. Slug rename on design→plan.
4. **Snapshot persistence round-trip**: `getSnapshot()` → serialize to manifest JSON → `createActor(machine, { snapshot })` → state matches. Round-trip from existing `.manifest.json` files.
5. **Full integration suite**: End-to-end flow through the new machine via the same events post-dispatch would send. Covers design→done happy path, cancel from each state, validate regression loop, implement fan-out with feature completion.

Prior art: Existing tests in `cli/src/__tests__/manifest-pure.test.ts`, `manifest.test.ts`, `post-dispatch.test.ts` cover the current behavior and serve as the specification for what the new machine must replicate.

## Out of Scope

- Hierarchical/parallel states in XState (not needed for current flow)
- XState DevTools or visual inspector integration
- Changing the watch loop's polling architecture
- Refactoring GitHub sync internals
- Feature machine as spawned child actors of the epic machine (keep them independent for simplicity)
- Changing gate configuration format or behavior

## Further Notes

- The `setup()` API is the current XState v5 best practice, superseding `provide()`. It enforces that all actions, guards, and services are provided at machine construction time.
- `manifest-store.ts` remains as-is — it's already a clean filesystem boundary. The machine's persist action calls through to it.
- The feature machine is intentionally simple. If feature lifecycle grows more complex (sub-tasks, dependencies), it can be extended without touching the epic machine.

## Deferred Ideas

- XState visual inspector for debugging pipeline state during development
- Spawned child actors for features (each feature as an actor within the epic actor system)
- Event sourcing: persist events instead of snapshots for full audit trail
- State chart diagram auto-generation from the machine definition
