# Event Log Fallback

## Context
When the configured dispatch strategy is non-SDK (cmux, iTerm2), `SessionHandle.events` is undefined — there is no async generator to iterate for structured messages. The dashboard's log panel would be empty for those sessions without a fallback path.

## Decision
A `FallbackEntryStore` converts WatchLoop EventEmitter lifecycle events (`session-started`, `session-completed`, `error`) into `LogEntry` objects with dispatching / completed / failed status. These entries are injected into `useDashboardTreeState` alongside ring-buffer entries. The log panel renders them in the same tree structure as SDK streaming entries — same component, same format, lifecycle-granularity only.

## Rationale
The WatchLoop already emits the minimum necessary lifecycle events. A converter layer (not a rendering layer change) keeps the log panel component unchanged. Separating `FallbackEntryStore` from the hook means the conversion logic is independently testable. The tree structure parity means the operator gets a consistent UI regardless of strategy — just fewer entries.

## Constraint
Fallback entries are lifecycle-only: no per-tool call granularity, no streaming text, no cost data. This is acceptable for non-SDK strategies that don't surface structured output.

## Source
.beastmode/artifacts/plan/2026-04-04-dashboard-dispatch-fix-event-log-fallback.md
