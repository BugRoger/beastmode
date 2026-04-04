---
phase: plan
slug: dead-man-switch
epic: dead-man-switch
feature: watch-loop-wiring
wave: 2
---

# Watch Loop Wiring

**Design:** `.beastmode/artifacts/design/2026-04-04-dead-man-switch.md`

## User Stories

2. As a pipeline operator, I want a dead session to be re-dispatched on the next scan cycle, so that epics recover from transient crashes without manual intervention.
3. As a pipeline operator, I want only the specific crashed session to be affected, so that other parallel sessions for different epics or features continue running.
4. As a pipeline operator, I want to see a `session-dead` event in the watch loop log/dashboard, so that I know when a session was detected as dead and recovery was triggered.

## What to Build

Wire the liveness engine into the watch loop's scan cycle and make dead session events observable.

**Watch Loop Integration:** In the `WatchLoop.tick()` method, call `sessionFactory.checkLiveness(activeSessions)` before the epic scan if the factory implements it. Pass all currently tracked sessions from `DispatchTracker`. The liveness check force-resolves dead sessions' promises, which the existing `watchSession` handler picks up — removing the session from the tracker and triggering `rescanEpic`. No special restart logic needed; the next scan naturally re-dispatches.

**Event System:** Add `session-dead` to `WatchLoopEventMap` with payload `{ epicSlug: string; phase: string; featureSlug?: string; sessionId: string; tty: string }`. Emit the event from within the liveness check (or from the watch loop after detecting a force-resolved session). The event fires before the re-dispatch, giving observers a clear causal sequence: dead → re-dispatch.

**Logger Subscriber:** Extend `attachLoggerSubscriber` to handle `session-dead` events. Format distinctly from normal errors — the operator should immediately see that a crash was detected and recovery is automatic.

**Session Isolation:** The implementation must ensure only the specific dead session is affected. The liveness check iterates sessions independently; force-resolution targets a single session ID. Other sessions — whether for different epics or different features within the same epic — continue uninterrupted.

## Acceptance Criteria

- [ ] Watch loop calls `checkLiveness` before each scan cycle when the factory supports it
- [ ] Dead sessions are removed from the tracker after promise resolution
- [ ] Dead sessions trigger re-dispatch on the next scan cycle via existing `rescanEpic` path
- [ ] `session-dead` event is emitted with correct payload (epicSlug, phase, featureSlug, sessionId, tty)
- [ ] `session-dead` event fires before the re-dispatch event in the event sequence
- [ ] Logger subscriber formats `session-dead` events distinctly from normal errors
- [ ] Parallel sessions for other epics are unaffected when one session dies
- [ ] Parallel sessions for other features within the same epic are unaffected when one session dies
- [ ] Multiple simultaneous dead sessions are each handled independently
