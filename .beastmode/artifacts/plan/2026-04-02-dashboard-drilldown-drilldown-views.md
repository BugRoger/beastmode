---
phase: plan
slug: dashboard-drilldown
epic: dashboard-drilldown
feature: drilldown-views
wave: 2
---

# Drilldown Views

**Design:** `.beastmode/artifacts/design/2026-04-02-dashboard-drilldown.md`

## User Stories

1. As a user viewing the epic table, I want to press Enter on an epic to see its features and their individual statuses, so that I can understand what's happening inside an epic without leaving the dashboard.

2. As a user viewing a feature list, I want to press Enter on an active feature to see a live structured log of the agent's output (text and tool calls), so that I can observe the agent working in real-time.

3. As a user drilled into a feature or agent log, I want to press Escape to go back to the previous view, so that navigation feels predictable and I never get lost.

4. As a user at any drill-down level, I want to see a breadcrumb bar showing my position in the view stack (e.g., "epics > cancel-cleanup > cancel-logic"), so that I always know where I am.

5. As a user at any drill-down level, I want the key hints bar to show only the keys that work in the current view, so that the interface teaches itself.

6. As a user, I want the activity log to remain visible at the bottom of every view, so that I always have a pipeline heartbeat regardless of drill-down depth.

## What to Build

Wire the three wave 1 foundation features into the dashboard's Ink component tree to create the full drill-down navigation experience.

**App layout refactor:** The root App component's content area becomes a view switcher. Based on the view stack's top entry, it renders one of three view components. The persistent chrome (header, crumb bar, activity log, key hints) remains outside the switcher and renders at all depths.

**Crumb bar component:** A new single-line Ink component between the header and the content area. Renders the crumb string from the view stack. The rightmost (active) segment is highlighted. Updates on every push/pop.

**EpicList view:** The existing EpicTable component adapted as a view. Enter on a selected epic pushes a FeatureList view onto the stack. Arrow keys navigate. Existing cancel and toggle-all behaviors remain.

**FeatureList view:** A new Ink component that displays the features of a selected epic. Shows feature slug, wave, status, and an inline spinner for active features. Enter on an active feature pushes an AgentLog view. Escape pops back to EpicList. Arrow keys navigate rows.

**AgentLog view:** A new Ink component that renders the ring buffer contents for a dispatched session. Shows structured log entries from the message mapper. New entries append at the bottom. Auto-follows (scrolls to bottom) by default, with `f` to toggle follow mode. Escape pops back to FeatureList.

**Context-sensitive key hints:** Each view type exports a key hint set. The footer bar reads from the active view. EpicList: `q quit ↑↓ navigate ↵ drill x cancel a all`. FeatureList: `q quit ↑↓ navigate ↵ drill ⎋ back`. AgentLog: `q quit ↑↓ scroll ⎋ back f follow`.

**Keyboard handler refactor:** The existing keyboard controller hook is extended to handle Enter (push) and Escape (pop) based on the active view type. The priority queue gains drill-down awareness: Enter and Escape are processed based on context.

**Activity log persistence:** The ActivityLog component continues to render at the bottom of every view, below the content area and above the key hints. No changes to its event subscription — it always shows the pipeline heartbeat.

## Acceptance Criteria

- [ ] Enter on an epic in EpicList navigates to FeatureList showing that epic's features
- [ ] Enter on an active feature in FeatureList navigates to AgentLog with live output
- [ ] Escape navigates back one level; Escape at root is a no-op
- [ ] Crumb bar shows current position and updates on navigation
- [ ] Key hints update to reflect the active view's available keys
- [ ] Activity log remains visible at all drill-down depths
- [ ] Existing EpicList functionality (cancel, toggle-all, quit) still works
- [ ] FeatureList shows feature slug, wave, status, and spinner for active features
- [ ] AgentLog renders ring buffer contents with auto-follow and toggle
