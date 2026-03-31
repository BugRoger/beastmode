---
phase: plan
epic: fullscreen-dashboard
feature: watchloop-events
---

# WatchLoop Events

**Design:** .beastmode/artifacts/design/2026-03-31-fullscreen-dashboard.md

## User Stories

2. As a pipeline operator, I want the dashboard to drive the pipeline (scan, dispatch, reconcile) so that I don't need a separate `beastmode watch` process running in another terminal.
3. As a pipeline operator, I want a scrolling activity log showing dispatched sessions, completions, errors, and blocked gates so that I can follow what the orchestrator is doing in real time.

## What to Build

Refactor the WatchLoop class to extend EventEmitter with typed events so that consumers (logger, dashboard, future tools) can subscribe to lifecycle events without modifying WatchLoop internals.

**Typed events to emit:**
- `session-started` — emitted when a phase session is dispatched (payload: epic slug, feature if applicable, phase, session ID)
- `session-completed` — emitted when a dispatched session finishes (payload: epic slug, feature, phase, success/failure, duration)
- `scan-complete` — emitted after each scan-dispatch-reconcile tick completes (payload: epics scanned count, dispatched count)
- `error` — emitted on dispatch failures or unexpected errors (payload: epic slug, error message)
- `epic-cancelled` — emitted when an epic is cancelled (payload: epic slug)

**Signal externalization:** The `setupSignalHandlers()` method becomes opt-in or removable. When the dashboard embeds WatchLoop, it does NOT install WatchLoop's signal handlers — the Ink app owns SIGINT/SIGTERM and calls `loop.stop()` directly. The headless `beastmode watch` command continues to install signal handlers as before. This is achieved by making signal handler setup configurable via the WatchDeps/config interface.

**Logger migration:** The existing logger calls inside WatchLoop are replaced with event emissions. A logger subscriber (function or small adapter) is wired up in the `beastmode watch` command entry point to preserve identical log output. This makes the watch loop more testable — tests can listen for events instead of capturing log output.

## Acceptance Criteria

- [ ] WatchLoop extends EventEmitter and emits typed events at each lifecycle point (session start, complete, scan, error, cancel)
- [ ] Signal handlers are opt-in — callers can choose not to install them
- [ ] `beastmode watch` works identically via a logger event subscriber
- [ ] Unit tests verify correct events emitted for dispatch, completion, error, and scan scenarios
