---
phase: plan
slug: f2d907
epic: fix-tree-log-rendering
feature: system-routing
wave: 1
---

# system-routing

**Design:** .beastmode/artifacts/design/2026-04-11-fix-tree-log-rendering.md

## User Stories

1. As a pipeline operator, I want SYSTEM to only show watch loop lifecycle events (session start/complete/dead, global errors), so that epic-scoped logs don't pollute the system view.

## What to Build

DashboardSink.write() currently pushes every entry to systemRef.entries unconditionally. The fix gates the systemRef push so that only entries without epic context reach the SYSTEM leaf. Epic-scoped entries are already routed to FallbackEntryStore and rendered under their epic nodes in the tree — no visibility is lost in aggregate mode.

The conditional should check whether context.epic is falsy before pushing to systemRef.entries. When context.epic is present, the entry still flows to FallbackEntryStore (existing behavior) but is excluded from the SYSTEM aggregate.

Unit tests should verify:
- Entries without context.epic are pushed to systemRef.entries
- Entries with context.epic are NOT pushed to systemRef.entries
- Entries with context.epic still reach FallbackEntryStore (existing behavior preserved)

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] SYSTEM leaf only contains entries where context.epic is falsy
- [ ] Epic-scoped entries still appear under their epic nodes in the tree
- [ ] Existing DashboardSink tests pass (updated to reflect new routing)
- [ ] New unit test covers the routing gate
