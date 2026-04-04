---
phase: plan
slug: flashy-dashboard
epic: flashy-dashboard
feature: overview-panel
wave: 1
---

# Overview Panel

**Design:** .beastmode/artifacts/design/2026-04-04-flashy-dashboard.md

## User Stories

4. As a user, I want the details panel to always show a static pipeline overview (phase distribution, active sessions/worktrees, git status) instead of updating dynamically per epic selection, so that I get a stable, informative summary at a glance.

## What to Build

**Replace dynamic details with static overview:** The current DetailsPanel switches between a pipeline overview (when "(all)" is selected) and per-epic details (when a specific epic is selected). Replace this with a single static overview that always shows regardless of epic selection.

**Overview content — three sections:**

1. **Phase distribution:** Count of epics in each phase (design, plan, implement, validate, release, done, cancelled). Render as a compact list with phase-colored labels and counts.

2. **Active sessions:** Count of active sessions sourced from the existing `activeSessions` Set in App.tsx. Worktree count is derived 1:1 from session count. Display as "N active sessions / N worktrees".

3. **Git status:** Current branch name and clean/dirty state. Read via shell command to git. Refresh on scan-complete events (same cadence as epic list refresh) — no separate polling loop.

**Remove per-epic detail views:** The `SingleSessionDetail` and `ImplementDetail` sub-views in DetailsPanel are no longer needed. The panel always renders the overview regardless of which epic is selected in the left panel.

**Props simplification:** The DetailsPanel no longer needs `selectedIndex`, `selectedEpicSlug`, or `trackerSessions` for per-epic rendering. It needs `epics` (for phase distribution), `activeSessions` (for session/worktree count), and git status data.

## Acceptance Criteria

- [ ] Overview panel always shows the same static content regardless of epic selection
- [ ] Phase distribution shows count per phase with phase-colored labels
- [ ] Active sessions and worktree count displayed correctly
- [ ] Git branch name and dirty/clean state displayed
- [ ] Git status refreshes on scan-complete events
- [ ] Per-epic detail views (SingleSessionDetail, ImplementDetail) removed
- [ ] Unit tests cover: phase distribution counting, active session aggregation
