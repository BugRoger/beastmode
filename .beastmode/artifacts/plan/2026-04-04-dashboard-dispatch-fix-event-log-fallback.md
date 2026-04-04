---
phase: plan
slug: 67acde
epic: dashboard-dispatch-fix
feature: event-log-fallback
wave: 3
---

# Event Log Fallback

**Design:** `.beastmode/artifacts/design/2026-04-04-67acde.md`

## User Stories

2. As a pipeline operator, I want the dashboard log panel to show event-based status (dispatching, completed, failed) when SDK streaming isn't available, so that I still have visibility into pipeline progress.

## What to Build

When the selected dispatch strategy is not SDK (i.e., iTerm2 or cmux), `SessionHandle.events` is undefined — the SDK streaming emitter doesn't exist. The dashboard's log panel currently assumes SDK streaming is always available.

The log panel and tree state hook must detect when `SessionHandle.events` is undefined and fall back to rendering status updates from the WatchLoop's EventEmitter events instead. The WatchLoop already emits lifecycle events (`session-started`, `session-completed`, `error`, `release:held`) that carry the same information shown by `beastmode watch` in non-SDK mode.

The fallback rendering should show:
- "dispatching" status when `session-started` fires
- "completed" status when `session-completed` fires with success
- "failed" status when `session-completed` fires with failure or `error` fires

These entries should appear in the same tree structure as SDK streaming entries — same panel, same format, just fewer entries (lifecycle events only instead of streaming output).

**Cross-cutting constraint:** The shared TreeView component between watch and dashboard means rendering parity is nearly free. Tree entries already store their level metadata. No data model changes needed.

## Acceptance Criteria

- [ ] Log panel shows "dispatching" status when a non-SDK session starts
- [ ] Log panel shows "completed" status when a non-SDK session succeeds
- [ ] Log panel shows "failed" status when a non-SDK session fails
- [ ] Lifecycle events render in the same tree structure as SDK streaming entries
- [ ] Dashboard remains functional (no crashes) when all sessions lack SDK streaming
- [ ] Unit test: log entry rendering for each lifecycle event type
