# WatchLoop Shutdown Sequence

## Context
The dashboard (`beastmode dashboard`) relies on the Bun event loop draining naturally after `loop.stop()` completes, because Ink owns signal handling (`installSignalHandlers: false`). Watch mode uses `process.exit()` via its own signal handlers — that escape hatch is not available in dashboard mode. Four categories of async work can hold the event loop open after stop() returns.

## Decision
The `stop()` method must perform a fixed sequence:

1. **Abort the current tick**: call `this.tickAbortController?.abort()` — cancels in-flight `reconcileGitHub()` and `gh()` subprocess calls
2. **Abort active sessions**: `tracker.abortAll()` then `await tracker.waitAll(5_000)` — 5-second timeout, not 30s
3. **Release the lockfile**: `releaseLock(this.config.projectRoot)`
4. **Emit `stopped`**: listeners receive the event before removal
5. **Remove all listeners**: `this.removeAllListeners()` — prevents late-firing `scan-complete` / `session-completed` events from spawning new async work in React subscribers

A per-tick `AbortController` is created at the start of each `tick()` invocation, stored on `this.tickAbortController`, and set to `null` on normal completion. `stop()` aborts it if non-null.

## Rationale
Skipping any step leaves a drain open: without AbortController, `reconcileGitHub` completes its current operation before the loop notices it should stop; without `removeAllListeners`, late-firing events resume async work; without `await proc.exited` on Bun spawns, process handles hold the event loop open.

NEVER add `process.exit()` as a safety net — it masks the real drain and prevents clean testing.

## Source
.beastmode/artifacts/design/2026-04-12-dashboard-graceful-exit-a18d.md
.beastmode/artifacts/implement/2026-04-12-dashboard-graceful-exit-a18d--graceful-exit-a18d.1.md
