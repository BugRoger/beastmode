---
phase: plan
slug: release-serialization
epic: release-serialization
feature: release-gate
wave: 1
---

# Release Gate

**Design:** `.beastmode/artifacts/design/2026-04-03-release-serialization.md`

## User Stories

1. As a pipeline operator, I want only one release running at a time, so that squash-merges to main don't conflict with each other.
2. As a pipeline operator, I want epics waiting for release to be dispatched in FIFO order by age, so that older epics release before newer ones.
4. As a pipeline operator, I want release locks to clear automatically when a release fails or is cancelled, so that the pipeline doesn't get stuck.
5. As a developer, I want manual `beastmode release <slug>` to bypass serialization, so that I can release on demand without waiting for the queue.

## What to Build

Add a `hasAnyReleaseSession()` query method to the DispatchTracker that returns true when any active session has phase === 'release'. This is a simple predicate over the existing sessions map — no new data structures.

In the watch loop's dispatch path, before dispatching a release-phase epic, call `hasAnyReleaseSession()`. If true, skip dispatch for this epic on this tick. The epic remains in the "release" manifest phase and will be picked up on a subsequent tick when the current release completes.

For FIFO ordering, ensure the watch loop processes epics in manifest creation date order (ascending). The manifest filenames already carry YYYY-MM-DD prefixes that sort chronologically. The `listEnriched()` scan should return manifests sorted by filename so that when multiple epics are eligible for release, the oldest one gets dispatched first.

Manual `beastmode release <slug>` does not pass through the watch loop dispatch path, so it naturally bypasses serialization. No code changes needed for manual bypass.

Release failure cleanup is already handled by the existing DispatchTracker `remove()` call in session completion callbacks. When a release session errors or completes, it's removed from the tracker, and `hasAnyReleaseSession()` will return false on the next tick. No special cleanup logic needed.

Update the orchestration context documentation to note the release phase exception to the "no concurrency cap" rule.

## Acceptance Criteria

- [ ] `DispatchTracker.hasAnyReleaseSession()` returns true when a release session is active, false otherwise
- [ ] Watch loop skips release dispatch when another release is in progress
- [ ] When multiple epics are eligible for release, the one with the oldest manifest creation date dispatches first
- [ ] After a release session fails or is cancelled, the next eligible release dispatches on the following tick
- [ ] Manual `beastmode release <slug>` is unaffected by serialization
- [ ] Unit tests cover `hasAnyReleaseSession()` true/false states
- [ ] Unit tests cover FIFO ordering with multiple manifests
- [ ] Integration test verifies only one release dispatches per tick when two epics are in release phase
- [ ] Orchestration context documents the release phase serialization exception
