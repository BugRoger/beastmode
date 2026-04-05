# Dispatch Strategy

## Context
The dashboard dispatches agent sessions via the WatchLoop. With iTerm2 as the sole dispatch backend, no strategy selection or override is needed.

## Decision
The dashboard uses `ITermSessionFactory` directly — the sole implementation of the `SessionFactory` interface. No strategy selection function, no config-driven dispatch override. The log panel displays lifecycle entries (dispatching / completed / failed) from the `FallbackEntryStore`, which converts WatchLoop events into `LogEntry` objects.

## Rationale
Single dispatch backend eliminates the strategy pattern complexity. The lifecycle entry approach provides meaningful visibility without requiring structured streaming output from terminal processes.

## Source
.beastmode/artifacts/design/2026-04-04-dashboard-dispatch-fix.output.json
