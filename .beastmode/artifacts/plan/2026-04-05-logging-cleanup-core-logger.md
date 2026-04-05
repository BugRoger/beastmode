---
phase: plan
slug: logging-cleanup
epic: logging-cleanup
feature: core-logger
wave: 2
---

# Core Logger

**Design:** .beastmode/artifacts/design/2026-04-05-logging-cleanup.md

## User Stories

1. As a CLI user, I want a single Logger interface with four levels (debug/info/warn/error), so that the API is minimal and predictable.
3. As a CLI user, I want to filter logs by epic and feature hierarchically (filtering by epic includes all its features), so that I can narrow output to the work I care about.
5. As a developer, I want a pluggable sink model (StdioSink, DashboardSink, TreeSink) behind a single LogSink interface, so that adding a new transport means implementing one write() method without duplicating gating logic.

## What to Build

Rewrite the core logging module to define the unified logging interface and default CLI transport.

**Logger interface** — four methods (debug, info, warn, error) each accepting `(msg: string, data?: Record<string, unknown>)`. A `child(ctx: Partial<LogContext>)` method returns a new Logger with merged context. The Logger passes every call to its injected LogSink — no verbosity gating in the Logger itself.

**LogEntry record** — the structured data object passed to sinks: `{ level, timestamp, msg, data, context }`. LogContext carries `{ phase?, epic?, feature? }` where epic > feature is the parent-child hierarchy and phase is orthogonal.

**LogSink interface** — `{ write(entry: LogEntry): void }`. This is the single contract all transports implement.

**StdioSink** — the default CLI sink. Writes to stdout (info, debug) or stderr (warn, error). Implements its own verbosity gating: at info level, debug entries are suppressed. At debug level (-v flag), all entries pass through. Formats output using the existing column-aligned format (updated for 4 levels).

**formatLogLine** — update the format function to handle 4 levels instead of 6. Level labels change: INFO, DEBUG, WARN, ERR. Remove DETL and TRACE labels.

**createNullLogger** — update to match the new 4-level interface.

**Cross-cutting constraint:** The old 6-method Logger interface (log, detail, debug, trace, warn, error) is replaced. All downstream consumers must update — this is handled by wave 3 features.

## Acceptance Criteria

- [ ] Logger interface exposes exactly debug, info, warn, error, child — no log(), detail(), trace()
- [ ] Logger methods accept (msg: string, data?: Record<string, unknown>)
- [ ] Logger delegates all calls to injected LogSink without filtering
- [ ] LogEntry includes level, timestamp, msg, data, and context fields
- [ ] LogSink interface has a single write(entry: LogEntry) method
- [ ] StdioSink implements LogSink and gates on verbosity (info suppresses debug)
- [ ] StdioSink writes warn/error to stderr, info/debug to stdout
- [ ] formatLogLine handles 4 levels with correct labels and colors
- [ ] child() merges context preserving epic > feature hierarchy
- [ ] createNullLogger matches the new 4-level interface
- [ ] TypeScript compiles with no type errors in the logger module
