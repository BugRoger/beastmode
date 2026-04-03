---
phase: plan
slug: release-serialization
epic: release-serialization
feature: release-held-event
wave: 1
---

# Release Held Event

**Design:** `.beastmode/artifacts/design/2026-04-03-release-serialization.md`

## User Stories

3. As a pipeline operator, I want to see which epics are waiting for release in the watch log and dashboard, so that I know why an epic hasn't released yet.

## What to Build

Add a new `release:held` event type to the WatchLoop EventEmitter type map. The event payload carries the waiting epic's slug and the blocking epic's slug (the one currently releasing).

When the watch loop skips a release dispatch due to serialization, emit the `release:held` event with both slugs. The blocking slug comes from querying the DispatchTracker for the active release session.

The existing logger subscriber (which logs structured events from the watch loop) subscribes to `release:held` and logs at info level with a message like "release held: <waiting> waiting for <blocking>".

The event type definition follows the existing pattern in `watch-types.ts` — a new interface for the payload and a new key in `WatchLoopEventMap`.

## Acceptance Criteria

- [ ] `WatchLoopEventMap` includes `release:held` event with `{ waitingSlug: string; blockingSlug: string }` payload
- [ ] Watch loop emits `release:held` when a release dispatch is skipped due to serialization
- [ ] Logger subscriber logs `release:held` events at info level
- [ ] Unit test verifies event emission with correct payload when release is held
