# OverviewPanel — Static Pipeline Summary

## Context
The original DetailsPanel switched between a pipeline overview (when "(all)" selected) and per-epic detail views (SingleSessionDetail, ImplementDetail) depending on selection state.

## Decision
Replace DetailsPanel entirely with a single static OverviewPanel that always shows the same three sections regardless of epic selection: phase distribution (epic count per phase), active sessions/worktree count (from existing `activeSessions` Set in App.tsx), and git branch + dirty/clean state (read via shell, refreshed on scan-complete events).

## Rationale
Dynamic details panels add complexity (selection state, multiple sub-views, conditional rendering) for minimal informational gain — pipeline overview at "(all)" was already the most useful view. Static content is always correct and stable without re-querying on selection changes. Git status refresh on scan-complete reuses the existing event cadence without adding a separate polling loop.

## Props Change
DetailsPanel's `selectedIndex`, `selectedEpicSlug`, and `trackerSessions` props are removed. OverviewPanel receives `epics`, `activeSessions`, and git status data only.

## Source
- .beastmode/artifacts/plan/2026-04-04-flashy-dashboard-overview-panel.md
- .beastmode/artifacts/design/2026-04-04-flashy-dashboard.md
