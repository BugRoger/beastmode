---
phase: plan
epic: status-watch
feature: change-highlight
---

# Change Highlight

**Design:** `.beastmode/artifacts/design/2026-03-30-status-watch.md`

## User Stories

2. As a pipeline operator, I want changed rows highlighted for one render cycle so that I notice when an epic transitions phases.
3. As a pipeline operator, I want to see blocked gate details in the live dashboard so that I know which epics need manual intervention and why.

## What to Build

Implement a change detection mechanism that compares the current poll's status state against the previous poll's state. For each epic, detect changes in phase, feature progress, or blocked status. When a change is detected, apply bold/inverse ANSI attributes (`\x1b[1m\x1b[7m`) to that row for one render cycle, then revert to normal on the next tick.

The diff logic should compare by epic slug, tracking: phase transitions, feature count changes, and blocked status transitions. Store the previous poll state as a simple map of slug-to-snapshot.

Blocked gate details are already partially surfaced via `formatStatus` (which shows "blocked: run beastmode <phase> <slug>"). Ensure this information renders correctly in watch mode — the blocked reason from the manifest's structured `blocked` field (`{ gate, reason }`) should be visible.

## Acceptance Criteria

- [ ] Changed rows render with bold/inverse ANSI for exactly one render cycle
- [ ] Phase transitions are detected and highlighted
- [ ] Feature progress changes are detected and highlighted
- [ ] Blocked status transitions are detected and highlighted
- [ ] Blocked gate details visible in watch mode status column
- [ ] Highlight reverts to normal on the next poll cycle (no sticky highlights)
- [ ] Unit tests for change detection diff logic
- [ ] Unit tests for highlight application and reversion
