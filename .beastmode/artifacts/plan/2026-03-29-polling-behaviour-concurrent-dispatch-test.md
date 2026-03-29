---
phase: plan
epic: polling-behaviour
feature: concurrent-dispatch-test
---

# concurrent-dispatch-test

**Design:** .beastmode/artifacts/design/2026-03-29-polling-behaviour.md

## User Stories

3. As a contributor, I want a test that proves concurrent `tick()` + `rescanEpic()` results in exactly one dispatch, so that the invariant is enforced in CI.

## What to Build

Add a test case to the existing watch loop test suite that exercises the concurrent dispatch scenario. The test fires `tick()` and `rescanEpic()` simultaneously (via `Promise.all` or equivalent) against a WatchLoop instance whose manifest has exactly one dispatchable action.

The session factory mock should include a controllable delay (e.g., a promise that doesn't resolve immediately) so both callers can enter the dispatch path concurrently. After both calls complete, assert that `sessionFactory.create()` was called exactly once — proving the mutex serialized the two callers and the second one saw the tracker state left by the first.

Use the existing `WatchDeps` dependency injection interface to provide mock dependencies. The test must use a real async mutex (the one from the dispatch-mutex feature), not a mock, to validate actual serialization behavior under concurrency.

## Acceptance Criteria

- [ ] Test exists that fires `tick()` and `rescanEpic()` concurrently
- [ ] Session factory mock includes artificial delay to force overlap
- [ ] Asserts `sessionFactory.create()` called exactly once (not zero, not two)
- [ ] Uses real async mutex (not mocked)
- [ ] Uses existing `WatchDeps` / `mockDeps()` test infrastructure
- [ ] Test passes reliably (no flakiness from timing assumptions)
