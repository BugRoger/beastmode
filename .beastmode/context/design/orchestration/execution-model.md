## Context
The pipeline poll loop needs to transition from CronCreate (session-scoped, 7-day max) to a durable external process.

## Decision
`beastmode watch` as foreground process with event-driven re-scan on session completion and 60-second configurable poll interval as safety net. No concurrency cap — API rate limits are the natural governor.

## Rationale
External process eliminates session-scoped lifetime limits. Event-driven re-scan provides immediate progression; poll interval catches edge cases. No artificial concurrency cap avoids premature bottlenecking.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
