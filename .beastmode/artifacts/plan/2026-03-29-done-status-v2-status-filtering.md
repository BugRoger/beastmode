---
phase: plan
epic: done-status-v2
feature: status-filtering
---

# Status Filtering

**Design:** .beastmode/artifacts/design/2026-03-29-done-status-v2.md

## User Stories

2. As a pipeline operator, I want the `beastmode status` table to show only active work by default so completed epics don't clutter the view
3. As a pipeline operator, I want a `--all` flag on `beastmode status` to see historical done/cancelled epics when needed

## What to Build

Update the status command to filter terminal-phase epics from the default view. The `buildStatusRows` function should exclude epics where phase is `"done"` or `"cancelled"` unless an `--all` flag is passed.

Parse the `--all` flag from the status command's args array and thread it through to `buildStatusRows`.

Remove the `phase === "release" && nextAction === null` heuristic in `formatStatus` — with explicit terminal phases, the phase value itself is sufficient. The formatStatus function can simply return the phase string for done/cancelled epics.

Extend `colorPhase` with styling for terminal phases: `"done"` gets green+dim, `"cancelled"` gets red+dim.

Extend `PHASE_ORDER` with sort positions for terminal phases: `done: 5` (sinks below active work in the sort), `cancelled: -1` (rises to top as abnormal state requiring attention).

## Acceptance Criteria

- [ ] `buildStatusRows` filters out done/cancelled epics by default
- [ ] `--all` flag shows all epics including done/cancelled
- [ ] `formatStatus` no longer uses the release+null heuristic
- [ ] `colorPhase("done")` returns green+dim styled text
- [ ] `colorPhase("cancelled")` returns red+dim styled text
- [ ] `PHASE_ORDER` includes `done: 5` and `cancelled: -1`
- [ ] Unit tests for buildStatusRows with and without --all flag
- [ ] Unit tests for formatStatus with done phase (no heuristic)
