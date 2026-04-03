---
phase: plan
slug: release-serialization
epic: release-serialization
feature: dashboard-queue-indicator
wave: 2
---

# Dashboard Queue Indicator

**Design:** `.beastmode/artifacts/design/2026-04-03-release-serialization.md`

## User Stories

3. As a pipeline operator, I want to see which epics are waiting for release in the watch log and dashboard, so that I know why an epic hasn't released yet.

## What to Build

The dashboard's React/Ink UI subscribes to the new `release:held` event from the WatchLoop EventEmitter. When received, it tracks which epic slugs are currently held for release and which epic is blocking them.

In the epic table rendering, epics that are in the release phase but held show a "queued" badge or visual indicator alongside their phase status. The indicator includes context about which epic is blocking. When the blocking release completes and the held epic dispatches, the indicator clears (driven by `session-started` or next `scan-complete` event).

State management follows the existing pattern — React state updated via event callbacks, cleared on session start or scan refresh.

## Acceptance Criteria

- [ ] Dashboard subscribes to `release:held` events
- [ ] Epics waiting for release show a visible "queued" indicator in the epic table
- [ ] Indicator shows which epic is blocking the release
- [ ] Indicator clears when the held epic begins its release session
- [ ] No indicator shown for epics in other phases or for manually released epics
