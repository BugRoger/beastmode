---
phase: plan
epic: xstate-pipeline-machine
feature: machine-definition
---

# Machine Definition

**Design:** `.beastmode/artifacts/design/2026-03-31-xstate-pipeline-machine.md`

## User Stories

1. As a developer, I want the pipeline states and transitions defined declaratively in one place, so that I can see the full state chart without reading imperative code across multiple files.
2. As a developer, I want transition guards (e.g., "advance from plan only if features exist") named and separated from the machine definition, so that I can test them independently.
3. As a developer, I want to hook side effects (persist, GitHub sync, slug rename) into specific transitions declaratively, so that business logic is attached to transitions rather than scattered in orchestration code.
4. As a developer, I want the watch loop to read dispatch instructions from state metadata rather than a separate `deriveNextAction()` function, so there's a single source of truth for what each state means.
5. As a developer, I want the feature status machine modeled separately from the epic machine, so that feature lifecycle has its own clean transition rules.

## What to Build

### Module: `cli/src/pipeline-machine/`

Create a new domain module containing two XState v5 machines and their supporting infrastructure.

### Types (`types.ts`)

Define TypeScript types for:
- **EpicContext**: mirrors `PipelineManifest` shape — slug, phase, features, artifacts, worktree, github, blocked, lastUpdated
- **EpicEvent**: discriminated union — `DESIGN_COMPLETED` (with realSlug payload), `PLAN_COMPLETED` (with features), `FEATURE_COMPLETED`, `VALIDATE_COMPLETED`, `VALIDATE_FAILED`, `RELEASE_COMPLETED`, `CANCEL`
- **FeatureContext**: slug, plan path, status, github issue number
- **FeatureEvent**: `START`, `COMPLETE`, `BLOCK`, `UNBLOCK`, `RESET`
- **DispatchType**: `'single' | 'fan-out' | 'skip'` for state metadata

### Epic Machine (`epic.ts`)

Use `setup()` API to declare a machine with:
- **7 states**: design, plan, implement, validate, release, done, cancelled
- **Transitions**: design→plan, plan→implement, implement→validate, validate→release, validate→implement (regression), release→done, any-non-terminal→cancelled
- **State metadata**: each state declares `meta: { dispatchType }` — design/plan/validate/release are `single`, implement is `fan-out`, done/cancelled are `skip`
- **Actions** (declared in `setup()`, implementations stubbed): `persist`, `enrichManifest`, `renameSlug`, `setFeatures`, `resetFeatures`, `markCancelled`, `markFeatureCompleted`
- **Services** (declared in `setup()`, implementations stubbed): `syncGitHub` as `fromPromise`
- **Guards** (declared in `setup()`, implementations stubbed): `hasFeatures`, `allFeaturesCompleted`, `outputCompleted`

### Feature Machine (`feature.ts`)

Use `setup()` API to declare a machine with:
- **4 states**: pending, in-progress, completed, blocked
- **Transitions**: pending→in-progress, in-progress→completed, in-progress→blocked, blocked→in-progress, any-non-completed→pending (reset)
- No side effects, no services — pure status tracking

### Guards (`guards.ts`)

Named guard implementations:
- `hasFeatures`: checks event payload or context for non-empty feature list
- `allFeaturesCompleted`: every feature in context has status === "completed"
- `outputCompleted`: event payload indicates output.status === "completed"

### Actions (`actions.ts`)

Named action implementations (using `assign` for context mutations, side-effect functions for I/O):
- `persist`: write context to disk via manifest-store
- `enrichManifest`: merge phase output features/artifacts into context
- `renameSlug`: update context.slug + rename manifest file on disk
- `setFeatures`: populate context.features from plan output
- `resetFeatures`: set all feature statuses to "pending"
- `markCancelled`: set phase to "cancelled"
- `markFeatureCompleted`: update single feature status

### Services (`services.ts`)

Async service implementations using `fromPromise`:
- `syncGitHub`: wraps existing `syncGitHub()` function, returns SyncResult, non-blocking (errors caught internally)

### Public API (`index.ts`)

Export:
- `createEpicActor(context)`: creates and returns a started actor from epic machine
- `loadEpic(snapshot)`: restores actor from persisted snapshot
- Event type constants for consumer use
- Type exports for external consumers

## Acceptance Criteria

- [ ] Epic machine has exactly 7 states with correct transitions matching the design's state chart
- [ ] Feature machine has exactly 4 states with correct transitions
- [ ] All guards, actions, and services are declared in `setup()` and referenced by name
- [ ] Each state node has `meta.dispatchType` set correctly (single/fan-out/skip)
- [ ] `CANCEL` event is valid from every non-terminal state (design, plan, implement, validate, release)
- [ ] `VALIDATE_FAILED` event triggers implement←validate regression with `resetFeatures` action
