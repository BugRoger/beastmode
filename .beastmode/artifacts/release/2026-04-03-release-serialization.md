---
phase: release
slug: release-serialization
epic: release-serialization
bump: minor
---

# Release: release-serialization

**Bump:** minor
**Date:** 2026-04-03

## Highlights

Serializes release phase dispatch so only one epic releases at a time, preventing squash-merge conflicts on main. Adds FIFO queue ordering, a `release:held` event for observability, and a dashboard queue indicator for held epics.

## Features

- Release gate in watch loop — `hasAnyReleaseSession()` on DispatchTracker blocks concurrent releases, FIFO ordering by manifest creation date
- `release:held` event on WatchLoop EventEmitter — carries waiting/blocking epic slugs, logged at info level
- Dashboard queue indicator — "Queued" badge on held epics with blocking epic tooltip, driven by `release:held` events

## Full Changelog

- `3fffc1e` design(release-serialization): checkpoint
- `78a5e0d` design(release-serialization): checkpoint
- `ba66562` plan(release-serialization): checkpoint
- `47f97d9` implement(release-serialization-release-held-event): checkpoint
- `4bff9ed` implement(release-serialization-release-gate): checkpoint
- `2b7fa34` implement(release-serialization-dashboard-queue-indicator): checkpoint
- `645118c` validate(release-serialization): checkpoint
- `ab6016c` validate(release-serialization): checkpoint
- `4a019eb` validate(release-serialization): fix artifact path
