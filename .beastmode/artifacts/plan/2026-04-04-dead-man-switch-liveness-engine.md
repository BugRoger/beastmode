---
phase: plan
slug: dead-man-switch
epic: dead-man-switch
feature: liveness-engine
wave: 1
---

# Liveness Engine

**Design:** `.beastmode/artifacts/design/2026-04-04-dead-man-switch.md`

## User Stories

1. As a pipeline operator, I want crashed iTerm2 sessions to be detected automatically, so that I don't have to manually monitor every dispatched session for silent failures.
5. As a pipeline operator, I want liveness detection to work without any session-side instrumentation, so that existing skills and agents don't need modification.

## What to Build

The core process liveness detection machinery for iTerm2 dispatched sessions. Three components:

**TTY Acquisition:** Extend `It2Client` with a method to retrieve the TTY device path for a given session ID. Called once at dispatch time (when `ITermSessionFactory.create` sets up a new pane), the TTY is stored alongside the session ID for later liveness checks.

**External Promise Resolution:** Modify `ITermSessionFactory`'s `watchForMarker` mechanism so the returned promise can be force-resolved from outside. Store the promise's `resolve` callback in a Map keyed by session ID. When a session is detected as dead, `checkLiveness` retrieves the stored resolver and completes the promise with a failure result (`success: false, exitCode: 1`).

**Liveness Check:** Implement `checkLiveness(sessions: DispatchedSession[]): Promise<void>` on `ITermSessionFactory`. For each session that has a stored TTY, run `ps -t <tty> -o args` and check whether any process has `beastmode` in its args. If no matching process is found, force-resolve the session's `watchForMarker` promise as failed. The method is batch-oriented — it checks all active sessions in a single call.

Add `checkLiveness?` as an optional method on the `SessionFactory` interface so that `SdkSessionFactory` and `CmuxSessionFactory` are unaffected.

## Acceptance Criteria

- [ ] `It2Client` can retrieve the TTY device path for a session ID
- [ ] TTY device path is captured and stored at dispatch time for each iTerm2 session
- [ ] `watchForMarker` promises are externally resolvable via stored resolve callbacks
- [ ] `checkLiveness` correctly identifies dead sessions (no `beastmode` process on TTY)
- [ ] `checkLiveness` correctly identifies alive sessions (beastmode process present on TTY)
- [ ] `checkLiveness` handles TTY lookup failures gracefully (session still running but TTY gone)
- [ ] `SessionFactory` interface includes optional `checkLiveness` method
- [ ] `SdkSessionFactory` is unaffected (no `checkLiveness` implementation required)
- [ ] Unit tests cover alive, dead, and error cases with mocked `ps` output
- [ ] Unit tests verify external promise resolution triggers the `watchSession` completion path
