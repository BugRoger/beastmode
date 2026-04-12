# Bun Subprocess Handle Leak

## Context
`Bun.spawn` returns a process handle. Consuming `proc.stdout` via `new Response(proc.stdout).text()` reads stdout to completion but does not guarantee the process handle is released — the handle can hold the Bun event loop open after the calling function returns.

## Decision
ALWAYS `await proc.exited` after reading stdout from a `Bun.spawn` call when the spawn is not part of a longer-lived pipeline. In `fetchGitStatus`, the rev-parse spawn requires an explicit `await proc.exited` after reading the branch name before the next spawn is created.

## Rationale
Node.js `child_process.exec` closes handles when stdout/stderr streams end. Bun's process handle lifetime does not follow the same implicit contract. Missing `await proc.exited` is invisible during normal operation but prevents the event loop from draining on shutdown.

## Scope
Applies to all `Bun.spawn` calls where the process is short-lived and its handle is not otherwise awaited or killed. Long-lived processes that are killed explicitly (via `proc.kill()` on abort) are not affected — `kill()` closes the handle.

## Source
.beastmode/artifacts/design/2026-04-12-dashboard-graceful-exit-a18d.md
.beastmode/artifacts/implement/2026-04-12-dashboard-graceful-exit-a18d--graceful-exit-a18d.1.md
