---
phase: design
epic-id: bm-a18d
epic-slug: dashboard-graceful-exit-a18d
epic-name: Dashboard Graceful Exit
---

## Problem Statement

The dashboard hangs on exit. When the user presses `q` or Ctrl+C, the process does not terminate — it sits indefinitely because the Bun event loop never drains. Watch mode works because its signal handler calls `process.exit(0)`, but dashboard mode disables signal handlers and relies on the event loop emptying naturally. Four categories of async work hold the event loop open after `loop.stop()` completes, making the dashboard unusable without force-killing the process.

## Solution

Fix all four event loop drains so the process exits cleanly without relying on `process.exit()`. Add verbose shutdown logging so the user can see what's happening during the shutdown sequence. Reduce the session wait timeout from 30s to 5s. Remove all event listeners on stop to prevent late-firing events from spawning new work.

## User Stories

1. As a dashboard user, I want the dashboard to exit promptly when I press `q`, so that I don't have to force-kill the process.
2. As a dashboard user, I want to see what's happening during shutdown (e.g., "aborting 2 sessions", "waiting for git processes", "clearing timers"), so that I know the exit is progressing and not hung.
3. As a dashboard user, I want in-flight GitHub reconciliation to be cancelled on exit, so that slow API calls don't block shutdown.
4. As a developer, I want all spawned subprocesses to be properly awaited or killed on exit, so that no orphan process handles keep the event loop alive.

## Implementation Decisions

- **No process.exit safety net**: All four drains will be fixed properly. No fallback `process.exit()` timeout. Trust the fixes.
- **Per-tick AbortController**: Each `tick()` invocation creates its own AbortController stored on the WatchLoop instance. `stop()` aborts the current tick's controller. The signal propagates through `reconcileGitHub()` down to individual `gh()` Bun.spawn calls. Normal tick completion disposes the controller.
- **AbortSignal propagation to gh()**: The `gh()` function (cli.ts) accepts an optional AbortSignal. When aborted, it kills the spawned Bun process via `proc.kill()`. `reconcileGitHub()` passes the signal through from tick context.
- **Remove all listeners in stop()**: `stop()` calls `this.removeAllListeners()` after emitting the `stopped` event. This prevents late-firing events (scan-complete, session-completed) from triggering fetchGitStatus, refreshEpics, or other async work in React subscribers.
- **Await proc.exited for git spawns**: In `fetchGitStatus()` (App.tsx), add `await proc.exited` after reading stdout from the first Bun.spawn (git rev-parse). This ensures the process handle is released before the function returns.
- **Guard createTag with running check**: In `watchSession()` (watch-loop.ts), wrap the `createTag()` call with `if (this.running)` to prevent spawning git processes after shutdown begins.
- **Reduce waitAll timeout to 5s**: Change `tracker.waitAll(30_000)` to `tracker.waitAll(5_000)`. iTerm2 sessions that haven't stopped after abort + 5s are abandoned.
- **Verbose shutdown logging**: Log each step during `stop()`: session abort count, wait start/complete, listener removal, lock release.

## Testing Decisions

- Unit test the per-tick AbortController lifecycle: create, abort on stop, no double-abort
- Unit test that `stop()` removes all listeners (verify `listenerCount()` is 0 after stop)
- Unit test that `watchSession` respects the `running` guard for `createTag`
- Integration test: verify dashboard exits within 5 seconds when no sessions are active
- Existing test patterns in `cli/src/__tests__/` use mock factories and trackers — follow the same pattern

## Out of Scope

- Refactoring the shutdown flow to use a structured teardown manager
- Making the waitAll timeout configurable via config.yaml
- Fixing orphan iTerm2 tabs (those are external processes, not event loop holders)
- Adding process.exit() as a safety net

## Further Notes

The root cause asymmetry between watch mode and dashboard mode exists because watch mode installs its own signal handlers that call `process.exit(0)`, while dashboard mode disables them (`installSignalHandlers: false`) so Ink can own signal handling. This is correct — the fix is to make the event loop drain properly, not to add a redundant process.exit.

## Deferred Ideas

None
