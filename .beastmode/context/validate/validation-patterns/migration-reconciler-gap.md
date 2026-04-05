# Migration Reconciler Gap

**Context:** manifest-absorption validate (2026-04-05). After 6 features implemented and merged, validate found 5 correctness bugs: slug rename via delete+recreate, feature status sync from XState to store, reDispatchCount not persisted, reDispatchCount hardcoded to 0 in buildContext, and worktree/branch rename after slug change.

**Decision:** In migration epics where a bridge/reconciler connects the new store to the existing runtime (XState), validate must run a full pipeline lifecycle test — not just per-feature BDD scenarios — because the reconciler integration surface is not exercised by any single feature's tests.

**Rationale:** Per-feature BDD tests validate that each consumer correctly calls the new store API. They do not validate that the reconciler, which reads XState machine state and writes back to the store, correctly round-trips all the fields the runtime depends on. The full-lifecycle test in pipeline-all exposed all five bugs; no per-feature test could have found any of them. This is expected behavior for migration epics, not a planning failure.
