# Ring Buffer

## Context
Users navigate between sessions at unpredictable times. A subscribe-on-demand model would miss history from before the user navigated to a session.

## Decision
Each dispatched session gets a ring buffer of ~100 recent log entries. Buffers collect continuously via the EventEmitter, even when the user is viewing a different session. Navigating to any session shows its buffer contents immediately.

## Rationale
Always-collecting buffers eliminate the "you had to be watching" problem. The ~100 entry cap bounds memory usage while providing enough context to understand recent agent activity. Ring buffer eviction is FIFO — oldest entries are lost first, which matches the user's interest in recent activity.

## Source
.beastmode/artifacts/design/2026-04-02-dashboard-drilldown.md
.beastmode/artifacts/implement/2026-04-02-dashboard-drilldown-sdk-streaming.md
