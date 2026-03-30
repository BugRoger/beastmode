---
phase: plan
epic: status-watch
feature: change-highlight
---

# Change Highlight

**Design:** .beastmode/artifacts/design/2026-03-30-status-watch.md

## User Stories

2. As a pipeline operator, I want changed rows highlighted for one render cycle so that I notice when an epic transitions phases.

## What to Build

Add change detection to the watch loop's render cycle. On each poll tick, compare the current set of status rows against the previous tick's rows. Rows whose phase, features count, or blocked status changed since the last render should be highlighted with bold/inverse ANSI attributes for exactly one render cycle, then revert to normal on the next tick.

The change detection module should:
- Accept previous and current arrays of status data (pre-ANSI, using the raw enriched manifest data for comparison)
- Return a set of epic slugs that changed between ticks
- The rendering function accepts the changed-slug set and applies bold/inverse ANSI wrapping to matching rows
- On the next tick, a fresh comparison produces a new (usually empty) changed set

Compare on logical state fields (phase, feature completion count, blocked status), not on rendered ANSI strings.

## Acceptance Criteria

- [ ] Changed rows render with bold/inverse ANSI attributes for exactly one render cycle
- [ ] Unchanged rows render normally
- [ ] Change detection compares phase, feature count, and blocked status
- [ ] Unit test verifies changed slugs are correctly identified from two state snapshots
- [ ] Unit test verifies highlight is applied for one cycle and cleared on the next
