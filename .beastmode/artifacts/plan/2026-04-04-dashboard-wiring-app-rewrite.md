---
phase: plan
slug: dashboard-wiring
epic: dashboard-wiring
feature: app-rewrite
wave: 1
---

# App Rewrite

**Design:** `.beastmode/artifacts/design/2026-04-04-dashboard-wiring.md`

## User Stories

1. As a user, I want App.tsx to render ThreePanelLayout with EpicsPanel, DetailsPanel, and LogPanel as its slots, so that the dashboard displays the k9s-style three-panel layout the original PRD specified.
2. As a user, I want the old drill-down components (EpicTable, FeatureList, AgentLog, ActivityLog, CrumbBar, view-stack) and legacy keyboard hooks (use-keyboard-controller, use-keyboard-nav, use-cancel-flow, use-toggle-all) deleted, so that there is no dead code or architectural confusion.

## What to Build

**App.tsx rewrite:** Replace the entire view-stack rendering architecture with a single ThreePanelLayout instantiation. The component receives three slot props populated by EpicsPanel, DetailsPanel, and LogPanel. State management changes from view-stack navigation to flat epic selection: App.tsx lifts selectedIndex from the keyboard hook, derives the selected epic from the epics array, and passes the selected epic's data down to DetailsPanel and LogPanel as props. The clock, epics list, active sessions, and watch loop integration remain — only the rendering and navigation architecture changes.

**Keyboard hook swap:** Replace useKeyboardController (which manages drill-down via view-stack push/pop) with use-dashboard-keyboard (which manages flat navigation: up/down in epics list, filter mode, cancel confirmation). The new hook returns DashboardKeyboardState containing nav state, cancel flow, shutdown state, toggle-all state, mode, and filter input. App.tsx wires the hook's dependencies (itemCount, onCancelEpic, onShutdown, slugAtIndex, onFilterApply, onFilterClear).

**State threading:** EpicsPanel receives epics, activeSessions, selectedIndex, and cancelConfirmingSlug. DetailsPanel receives epics, selectedIndex, and activeSessions. LogPanel receives the TreeState from useDashboardTreeState. ThreePanelLayout receives watchRunning, clock, the three slot children, key hints derived from the keyboard mode, isShuttingDown, and cancelPrompt.

**Old component deletion:** Hard delete EpicTable.tsx, FeatureList.tsx, AgentLog.tsx, ActivityLog.tsx, CrumbBar.tsx, view-stack.ts, use-keyboard-controller.ts, use-keyboard-nav.ts, use-cancel-flow.ts, use-toggle-all.ts. These become import errors if any consumer remains — grep verification confirms no surviving imports.

**Barrel export cleanup:** Update the hooks barrel (hooks/index.ts) to remove re-exports of deleted hooks. Ensure use-dashboard-keyboard and use-dashboard-tree-state are exported.

## Acceptance Criteria

- [ ] App.tsx renders ThreePanelLayout with EpicsPanel, DetailsPanel, and LogPanel as slot children
- [ ] use-dashboard-keyboard is the sole keyboard handler — no useKeyboardController import
- [ ] Epic selection in EpicsPanel propagates to DetailsPanel and LogPanel via props
- [ ] All old components deleted: EpicTable, FeatureList, AgentLog, ActivityLog, CrumbBar
- [ ] All old modules deleted: view-stack.ts
- [ ] All old hooks deleted: use-keyboard-controller, use-keyboard-nav, use-cancel-flow, use-toggle-all
- [ ] hooks/index.ts barrel exports only surviving hooks
- [ ] No import errors — grep confirms zero references to deleted modules
- [ ] Existing panel unit tests still pass (ThreePanelLayout, EpicsPanel, DetailsPanel, LogPanel)
