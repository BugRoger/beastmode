# Lifecycle Log Entries

## Context
Terminal-dispatched sessions (iTerm2) have no structured streaming output. The dashboard's log panel needs entries to display for active and completed sessions.

## Decision
A `FallbackEntryStore` converts WatchLoop EventEmitter lifecycle events (`session-started`, `session-completed`, `error`) into `LogEntry` objects with dispatching / completed / failed status. These entries are injected into `useDashboardTreeState`. The log panel renders them in a tree structure (epic > phase > feature).

## Rationale
The WatchLoop already emits the minimum necessary lifecycle events. A converter layer (not a rendering layer change) keeps the log panel component unchanged. Separating `FallbackEntryStore` from the hook means the conversion logic is independently testable. The tree structure provides a consistent UI with lifecycle-granularity entries.

## Constraint
Entries are lifecycle-only: no per-tool call granularity, no streaming text. This is the expected behavior for terminal-dispatched sessions.

## Source
.beastmode/artifacts/plan/2026-04-04-dashboard-dispatch-fix-event-log-fallback.md
