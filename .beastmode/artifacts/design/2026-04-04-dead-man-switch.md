---
phase: design
slug: dead-man-switch
epic: dead-man-switch
---

## Problem Statement

Dispatched iTerm2 sessions that crash, fail to start, or exit without producing `output.json` leave the watch loop holding a promise that never resolves. The session appears active in the `DispatchTracker` indefinitely (up to a 60-minute safety timeout), blocking the epic from progressing. When running multiple parallel sessions, a single crashed session blocks its epic while others continue — but there is no mechanism to detect the crash and recover.

## Solution

Add process liveness detection to `ITermSessionFactory`. During each watch loop scan cycle, check whether the dispatched process is still alive by inspecting the TTY process tree of the iTerm2 session. If no `beastmode` process is found on the TTY, resolve the hung `watchForMarker` promise as failed. The watch loop's existing re-scan logic then sees no active session for the epic and naturally re-dispatches a fresh session. Only the crashed session is affected — parallel sessions on other TTYs continue uninterrupted.

## User Stories

1. As a pipeline operator, I want crashed iTerm2 sessions to be detected automatically, so that I don't have to manually monitor every dispatched session for silent failures.

2. As a pipeline operator, I want a dead session to be re-dispatched on the next scan cycle, so that epics recover from transient crashes without manual intervention.

3. As a pipeline operator, I want only the specific crashed session to be affected, so that other parallel sessions for different epics or features continue running.

4. As a pipeline operator, I want to see a `session-dead` event in the watch loop log/dashboard, so that I know when a session was detected as dead and recovery was triggered.

5. As a pipeline operator, I want liveness detection to work without any session-side instrumentation, so that existing skills and agents don't need modification.

## Implementation Decisions

- **Scope**: Watch loop dispatched sessions only (SDK, iTerm2, cmux). Manual CLI sessions are human-supervised and excluded. cmux liveness detection is deferred — iTerm2 is the primary use case.
- **Detection method**: TTY process tree check. Get the TTY device from `it2 session list --json` at dispatch time. At check time, run `ps -t <tty> -o args` and look for any process with `beastmode` in its args. No `beastmode` process on the TTY = dead session.
- **Process match**: Match `beastmode` in process args on the TTY. This covers both `bun` (CLI orchestrator: `bun .../beastmode <phase>`) and `claude` (agent: `claude ... /beastmode:<phase>`). If neither is running, the dispatched work is definitively dead.
- **TTY storage**: Store the TTY device path alongside the pane session ID in `ITermSessionFactory` when creating the session. Query `it2 session list --json` after creating/splitting the pane to find the TTY for the new session ID.
- **Check frequency**: Runs during the existing watch loop scan cycle (default 60s). No separate timer or background interval.
- **Grace period**: None. If `beastmode` is absent from the TTY at check time, the session is declared dead immediately. By the time the first scan runs (~60s after dispatch), the process should be well established.
- **Recovery mechanism**: Fail-and-rescan. The factory resolves the hung `watchForMarker` promise with `{ success: false, exitCode: 1, durationMs: ... }`. The watch loop's `watchSession()` handler removes the session from the tracker and emits `session-completed` with `success: false`. The next scan cycle sees no active session and dispatches a new one via the normal path. No special restart logic needed.
- **Interface**: Add `checkLiveness?(sessions: DispatchedSession[]): Promise<void>` to the `SessionFactory` interface as an optional method. The watch loop calls it before each scan if present. The `ITermSessionFactory` implements it; `SdkSessionFactory` and `CmuxSessionFactory` do not (SDK already handles crashes via promise resolution; cmux is deferred).
- **Promise resolution**: The `watchForMarker` promise must be externally resolvable. Store the `resolve` function in a Map keyed by session ID so that `checkLiveness` can force-resolve dead sessions.
- **Event**: Emit a new `session-dead` event on the `WatchLoopEventMap` with payload `{ epicSlug: string; phase: string; featureSlug?: string; sessionId: string; tty: string }`. The logger subscriber and dashboard can render this distinctly from normal errors.
- **Configuration**: Always enabled for iTerm2 dispatch strategy. No config toggle — if you're using terminal dispatch, you want liveness checks.
- **`It2Client` changes**: Add `getSessionTty(sessionId: string): Promise<string | null>` method that calls `it2 session list --json`, finds the session by ID, and returns the `tty` field. Called once at dispatch time, not during liveness checks.

## Testing Decisions

- Unit test `checkLiveness` with mock `ps -t` output: alive (beastmode in args), dead (only fish/login), and error (TTY not found).
- Unit test the external promise resolution mechanism — verify that force-resolving a `watchForMarker` promise correctly triggers the `watchSession` completion path.
- Unit test that `SdkSessionFactory` (no `checkLiveness`) is unaffected — the optional interface method is simply not called.
- Integration test: dispatch a session via iTerm2 factory mock, simulate the process dying (mock `ps` returns no beastmode), verify the promise resolves as failed and the session is removed from the tracker.
- Existing iTerm2 factory tests (e.g., in `it2.test.ts`) provide test patterns for mocking the `it2` CLI and `SpawnFn`.

## Out of Scope

- cmux liveness detection (deferred — same pattern can be applied later)
- SDK session liveness (already handled — promises resolve on crash)
- Manual CLI session monitoring (human-supervised)
- Session heartbeats or mid-session health reporting
- Configurable timeout or max-retry limits for re-dispatch
- Process-level resource monitoring (CPU, memory, token usage)

## Further Notes

- The `LogEntry` type already defines a `"heartbeat"` type that is unused. This was likely forward-looking for exactly this kind of monitoring, but the dead-man switch takes a different approach (external process check vs. session-emitted heartbeat).
- The existing 60-minute `watchTimeoutMs` in `ITermSessionFactory` remains as a backstop. The liveness check shortens the detection window from 60 minutes to ~60 seconds (one scan cycle).

## Deferred Ideas

- cmux dead-man switch using the same TTY-based pattern (cmux surfaces also have TTYs)
- Configurable max-retries for dead sessions before marking the epic as blocked
- Dashboard notification badge for dead session events
