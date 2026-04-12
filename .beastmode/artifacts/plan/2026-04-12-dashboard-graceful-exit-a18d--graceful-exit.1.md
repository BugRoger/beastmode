---
phase: plan
epic-id: bm-a18d
epic-slug: dashboard-graceful-exit-a18d
feature-name: Graceful Exit
wave: 1
---

# Graceful Exit

**Design:** .beastmode/artifacts/design/2026-04-12-dashboard-graceful-exit-a18d.md

## User Stories

1. As a dashboard user, I want the dashboard to exit promptly when I press `q`, so that I don't have to force-kill the process.
2. As a dashboard user, I want to see what's happening during shutdown (e.g., "aborting 2 sessions", "waiting for git processes", "clearing timers"), so that I know the exit is progressing and not hung.
3. As a dashboard user, I want in-flight GitHub reconciliation to be cancelled on exit, so that slow API calls don't block shutdown.
4. As a developer, I want all spawned subprocesses to be properly awaited or killed on exit, so that no orphan process handles keep the event loop alive.

## What to Build

### Per-tick AbortController lifecycle

The WatchLoop needs a per-tick AbortController that scopes the cancellability of each tick's async work. On each `tick()` invocation, a new AbortController is created and stored on the instance. When `stop()` is called, it aborts the current controller. Normal tick completion disposes the controller. This gives `stop()` a mechanism to cancel in-flight reconciliation work.

### AbortSignal propagation through gh()

The `gh()` subprocess helper needs to accept an optional AbortSignal. When the signal fires, the helper kills the spawned Bun process via `proc.kill()`. The `reconcileGitHub()` function (and its callchain) needs to thread the signal from the tick's AbortController down to each `gh()` call. This ensures that slow GitHub API calls are terminated on shutdown rather than blocking the event loop.

### Listener removal on stop

After emitting the `stopped` event, `stop()` must call `removeAllListeners()` on the WatchLoop EventEmitter. This prevents late-firing events (`scan-complete`, `session-completed`) from triggering `fetchGitStatus`, `refreshEpics`, or other async work in React subscribers. Without this, the React component's event handlers continue to spawn async work after the loop has conceptually stopped.

### Subprocess handle cleanup in fetchGitStatus

The dashboard's `fetchGitStatus` function spawns a `git rev-parse` process but does not explicitly await `proc.exited` on it. While stdout consumption implicitly resolves the process, the handle may not be released synchronously. Adding `await proc.exited` ensures the process handle is properly released and doesn't hold the event loop open.

### Guard createTag with running check

In `watchSession()`, the `createTag()` call runs unconditionally after a successful session completes. If `stop()` has already set `running = false`, this spawns a git subprocess after shutdown begins, keeping the event loop open. Wrapping the call with `if (this.running)` prevents this.

### Reduce waitAll timeout

The `tracker.waitAll(30_000)` timeout is too long for an interactive exit. Reducing it to 5 seconds means sessions that don't respond to abort within 5s are abandoned. This is acceptable — iTerm2 sessions are external processes and won't hold the Bun event loop open once abandoned.

### Verbose shutdown logging

Each step in `stop()` should log what it's doing: how many sessions are being aborted, when the wait starts and completes, when listeners are removed, when the lock is released. This gives the user visibility into shutdown progress so they know the process isn't hung.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Dashboard exits within 5 seconds when `q` is pressed with no active sessions
- [ ] Dashboard exits within 10 seconds when `q` is pressed with active sessions (abort + 5s wait)
- [ ] In-flight `gh` subprocess calls are killed when the tick's AbortController fires
- [ ] `stop()` logs each shutdown step (abort count, wait status, listener removal, lock release)
- [ ] `fetchGitStatus` awaits `proc.exited` on the git rev-parse spawn
- [ ] `createTag` is not called when `running` is false
- [ ] `listenerCount()` returns 0 for all events after `stop()` completes
- [ ] No `process.exit()` is used anywhere in the shutdown path
