---
phase: plan
epic: xstate-pipeline-machine
feature: machine-tests
---

# Machine Tests

**Design:** `.beastmode/artifacts/design/2026-03-31-xstate-pipeline-machine.md`

## User Stories

6. As a developer, I want comprehensive tests for all transitions, guards, actions, persistence round-trips, and integration flows before any consumer is changed, so that the refactor doesn't break the pipeline.
7. As a developer, I want existing `.manifest.json` files to work without migration, so that in-flight epics are unaffected.

## What to Build

### Test Suite: `cli/src/pipeline-machine/__tests__/`

Five categories of tests, all written against the machine definitions from `machine-definition`. Tests use `provide()` to inject mock implementations for actions and services where needed.

### Epic Transition Tests (`epic.test.ts`)

Test every valid state transition in the epic machine:
- Happy path: design → plan → implement → validate → release → done
- Guard-blocked transitions: plan → implement blocked when no features, implement → validate blocked when features incomplete, validate → release blocked when output not completed
- Validate regression: validate → implement via `VALIDATE_FAILED`, verifies `resetFeatures` action fires
- Cancel from every non-terminal state: design, plan, implement, validate, release all accept `CANCEL`
- Terminal states (done, cancelled) reject all events
- Invalid transitions: verify states don't accept events they shouldn't

### Feature Transition Tests (`feature.test.ts`)

Test every valid state transition in the feature machine:
- pending → in-progress → completed (happy path)
- in-progress → blocked → in-progress (block/unblock cycle)
- Reset from any non-completed state back to pending
- completed is terminal — rejects further events

### Guard Tests (within `epic.test.ts`)

Test each guard independently:
- `hasFeatures`: returns false for empty features array, true for non-empty
- `allFeaturesCompleted`: returns false if any feature not completed, true when all completed
- `outputCompleted`: returns false for non-completed output status, true for completed

### Persistence Round-Trip Tests (`persistence.test.ts`)

Verify snapshot serialization works with existing manifest format:
- Create actor → advance through states → `getPersistedSnapshot()` → serialize to JSON → deserialize → `createActor(machine, { snapshot })` → verify state matches
- Load real `.manifest.json` fixture (existing format) → map to machine context → create actor → verify correct state
- Round-trip preserves: phase, slug, features with statuses, artifacts, github metadata, blocked state
- Verify no extra fields added to serialized output (backward compat)

### Integration Tests (`integration.test.ts`)

End-to-end flows through the machine using the same event sequence post-dispatch would send:
- Full design → done happy path with enrichment and feature completion at each step
- Cancel from mid-pipeline (e.g., from implement) — verify cleanup actions fire
- Validate regression loop: implement → validate → fail → implement → validate → pass → release → done
- Implement fan-out: dispatch features, complete them one-by-one, verify `allFeaturesCompleted` guard only passes when last feature completes
- State metadata: verify `getMeta()` returns correct `dispatchType` for each state

## Acceptance Criteria

- [ ] All valid epic transitions tested (happy path, regression, cancel from each state, terminal rejection)
- [ ] All valid feature transitions tested (happy path, block/unblock, reset)
- [ ] Guard tests cover true/false cases and edge cases (empty features, partial completion)
- [ ] Persistence round-trip test proves existing `.manifest.json` format loads without migration
- [ ] Integration tests cover design→done, cancel, regression loop, and fan-out completion scenarios
