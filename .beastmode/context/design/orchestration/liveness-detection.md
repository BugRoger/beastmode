## Context
Dispatched terminal sessions (iTerm2) that crash or exit without producing output.json leave the watch loop holding a hung promise indefinitely. The existing 60-minute safety timeout is too slow for production pipelines.

## Decision
External process liveness detection via TTY process tree inspection. At each watch loop scan cycle, `checkLiveness` runs `ps -t <tty> -o args=` for each dispatched session's stored TTY device path and checks for `beastmode` in process args. If absent, the session's `watchForMarker` promise is force-resolved as failed. The existing rescan-and-redispatch path handles recovery naturally.

## Rationale
External observation (process tree check) over internal instrumentation (heartbeats). No session-side changes required -- skills and agents run unmodified. TTY device path is captured once at dispatch time via `It2Client.getSessionTty()`. The `SessionFactory` interface uses an optional `checkLiveness` method so non-iTerm2 factories (SDK, cmux) are unaffected.

## Key Implementation Details
- Dual-ID mapping: `dispatchToPaneId` bridges dispatch session IDs to iTerm2 pane session IDs since the two namespaces differ
- `ps` command failure (non-zero exit) is treated as "unknown" not "dead" -- conservative fail-open
- `session-dead` event emitted via snapshot-diff pattern: capture tracked session IDs before `checkLiveness`, compare after, emit for any that disappeared
- Map cleanup (ttyMap, resolvers, dispatchToPaneId) required in both completion and abort paths

## Source
`.beastmode/artifacts/design/2026-04-04-dead-man-switch.md`
