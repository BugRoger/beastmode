---
phase: plan
slug: dashboard-drilldown
epic: dashboard-drilldown
feature: sdk-streaming
wave: 1
---

# SDK Streaming

**Design:** `.beastmode/artifacts/design/2026-04-02-dashboard-drilldown.md`

## User Stories

7. As a user, I want agent output to be available immediately when I navigate to a feature, even if I wasn't viewing it before, so that I can check on any session without having to have been watching it from the start.

## What to Build

Refactor the SDK dispatch path from fire-and-forget (`await agent.query()`) to async generator iteration using the SDK's `query()` function export with `includePartialMessages: true`. The generator yields streaming messages: partial assistant messages (text/tool deltas), complete assistant turns, tool progress heartbeats, and result messages.

Add an EventEmitter field to the DispatchedSession interface. The dispatch loop iterates the async generator and emits each message on this emitter. Downstream consumers (the ring buffer, the agent log view) subscribe to these events.

Implement a ring buffer (~100 entries) per dispatched session. The buffer subscribes to the session's emitter and stores structured log entries. Buffers collect continuously regardless of which view is active. When the user navigates to a session's agent log, the buffer contents are immediately available.

When the dashboard is running, force the dispatch strategy to `sdk` regardless of the `cli.dispatch-strategy` config setting. This is a runtime override applied in the dashboard command, not a config mutation.

Integration test: dispatch a phase via the new path and verify messages are emitted on the session's EventEmitter.

## Acceptance Criteria

- [ ] `dispatchPhase()` uses SDK `query()` AsyncGenerator instead of `agent.query()` Promise
- [ ] DispatchedSession interface has an EventEmitter field for message streaming
- [ ] Ring buffer per session collects log entries continuously
- [ ] Ring buffer contents are available immediately when navigating to a session
- [ ] Dashboard forces `sdk` dispatch strategy at runtime
- [ ] Existing non-dashboard dispatch paths continue to work
- [ ] Integration test verifies message emission
