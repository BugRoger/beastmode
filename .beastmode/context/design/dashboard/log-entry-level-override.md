# LogEntry.level Override Field

## Context
`lifecycleToLogEntry()` in `FallbackEntryStore` returns entries with `type: "text"`. The existing `entryTypeToLevel()` maps `"text"` to `"info"`. Lifecycle events like `scan-complete`, `session-started`, and `session-dead` need debug or warn levels — but changing their `type` field would break other consumers.

## Decision
Add an optional `level` field to the `LogEntry` interface in `factory.ts`. Update `entryTypeToLevel()` to check for and prefer this explicit field before falling back to the type-based mapping. Set the correct level in `lifecycleToLogEntry()` per the reclassification table.

## Rationale
The type field encodes semantic entry kind (text, status, etc.). Level is an independent axis. Conflating them (using fake types like `"heartbeat"`) would pollute the type system and confuse future readers. An explicit optional field is the minimal-surface change: zero breaking changes to existing consumers, retroactively correct behavior for existing text entries.

## Reclassification Table
| Event | Level |
|-------|-------|
| scan-complete | debug |
| started (watch loop) | debug |
| stopped (watch loop) | debug |
| session-started | debug |
| session-completed (success) | debug |
| session-dead | warn |
| epic-blocked | warn |
| release:held | warn |
| session-completed (failed) | error (unchanged) |
| epic-cancelled | info (unchanged) |

## Source
.beastmode/artifacts/design/2026-04-05-dashboard-log-fixes.output.json
.beastmode/artifacts/plan/2026-04-05-dashboard-log-fixes-event-routing-and-levels.md
