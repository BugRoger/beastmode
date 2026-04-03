---
phase: design
slug: release-serialization
epic: release-serialization
---

## Problem Statement

When multiple epics reach the release phase simultaneously, the watch loop dispatches all of them in parallel. Each release squash-merges to main independently, causing merge conflicts and a messy main branch. The current design explicitly states "No concurrency cap" which is correct for plan, implement, and validate — but release is the one phase where all epics converge on a single branch.

## Solution

Serialize release phase dispatch in the watch loop so only one release runs at a time. Epics waiting for release are held and retried on subsequent ticks in FIFO order by manifest creation date. A new EventEmitter event provides visibility into the queue, and the dashboard shows a status indicator for held epics.

## User Stories

1. As a pipeline operator, I want only one release running at a time, so that squash-merges to main don't conflict with each other.
2. As a pipeline operator, I want epics waiting for release to be dispatched in FIFO order by age, so that older epics release before newer ones.
3. As a pipeline operator, I want to see which epics are waiting for release in the watch log and dashboard, so that I know why an epic hasn't released yet.
4. As a pipeline operator, I want release locks to clear automatically when a release fails or is cancelled, so that the pipeline doesn't get stuck.
5. As a developer, I want manual `beastmode release <slug>` to bypass serialization, so that I can release on demand without waiting for the queue.

## Implementation Decisions

- Serialization scope is release phase only. Plan, implement, and validate remain fully parallel across epics.
- The DispatchTracker gets a new `hasAnyReleaseSession()` method that checks whether any active session is a release phase. The watch loop calls this before dispatching a release — if true, it skips dispatch for that tick.
- Waiting epics stay in the "release" manifest phase. No new manifest state. The watch loop simply doesn't dispatch them until the current release finishes. Next tick picks up the next eligible epic.
- FIFO ordering uses the manifest creation date (extracted from the YYYY-MM-DD prefix in the manifest filename). When multiple epics are eligible for release, the oldest one wins.
- Concurrency limit is hardcoded to 1. Not configurable. If someone needs parallel releases, that's a separate feature.
- Release failure and cancellation clear the lock automatically. The DispatchTracker already removes sessions on completion (both success and error paths in ReconcilingFactory). No special cleanup needed.
- Manual `beastmode release <slug>` does not enforce serialization. The check only applies to automated watch loop dispatch.
- A new `release:held` typed event on the WatchLoop EventEmitter carries the waiting epic slug and the blocking epic slug. The logger subscriber logs at info level ("release held: <waiting> waiting for <blocking>"). The dashboard subscribes to render a status indicator.
- The dashboard shows a "queued" badge or similar indicator next to epics in the release phase that are being held. Data comes from the `release:held` event, not from the manifest.
- The existing "No concurrency cap" design note in orchestration context should be updated to note the release phase exception.

## Testing Decisions

- Unit test `hasAnyReleaseSession()` on DispatchTracker — verify it returns true when a release session exists, false otherwise.
- Unit test FIFO ordering — create multiple manifests with different creation dates, verify the oldest is dispatched first.
- Integration test in watch loop — simulate two epics reaching release simultaneously, verify only one dispatches per tick and the second dispatches after the first completes.
- Test failure cleanup — simulate a release session error, verify `hasAnyReleaseSession()` returns false after cleanup.
- Existing watch loop tests (e.g., "handles multiple epics in parallel") should be updated to reflect the release serialization behavior.
- Prior art: `cli/src/__tests__/watch.test.ts` has existing parallel dispatch tests and mock session factories.

## Out of Scope

- Configurable concurrency limit (hardcoded to 1)
- Serialization of validate phase
- Serialization of manual CLI releases
- Cross-process release locking (only in-memory within the watch loop)
- Release priority beyond FIFO ordering

## Further Notes

The design note "No concurrency cap — API rate limits are the natural governor" in the orchestration context and DESIGN.md should be amended to "No concurrency cap except release phase, which is serialized to prevent merge conflicts on main."

## Deferred Ideas

None
