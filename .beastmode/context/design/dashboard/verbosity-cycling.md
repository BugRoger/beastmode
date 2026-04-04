# Verbosity Cycling

## Context
Dashboard operators running long epics wanted to suppress low-signal log noise (debug/trace) by default while retaining the ability to drill in without restarting the dashboard.

## Decision
Verbosity state lives in the root `App` component, initialized from the CLI `--verbosity` arg, and flows down as props. The `v` key cycles through 4 levels (info → detail → debug → trace → info) using modular increment on a numeric index. Filtering happens at render time in `LogPanel` — entries are hidden, not removed from ring buffers.

## Rationale
Root-level state ownership means a single re-render propagates the change to all panels. Render-time filtering (not buffer eviction) preserves history: increasing verbosity immediately reveals previously hidden entries with no re-fetch. Four levels (0-3) mirror the existing `TreeEntry.level` enum — no new type is needed.

## Source
.beastmode/artifacts/plan/2026-04-04-dashboard-dispatch-fix-verbosity-cycling.md
