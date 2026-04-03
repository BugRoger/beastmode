---
phase: plan
slug: dashboard-rework
epic: dashboard-rework
feature: old-dashboard-cleanup
wave: 3
---

# Old Dashboard Cleanup

**Design:** `.beastmode/artifacts/design/2026-04-03-dashboard-rework.md`

## User Stories

9. As a user, I want `beastmode status` and `beastmode status --watch` to continue working independently, so that I have lightweight options when I don't need fullscreen.

## What to Build

Delete the old dashboard components, hooks, and navigation system that are fully replaced by the new three-panel layout. Verify that the non-dashboard commands (`beastmode status`, `beastmode status --watch`) remain fully functional.

**Delete these files:**
- EpicTable.tsx (replaced by epics-panel)
- FeatureList.tsx (replaced by details-panel feature list)
- AgentLog.tsx (replaced by log-panel)
- ActivityLog.tsx (replaced by log-panel aggregate stream)
- CrumbBar.tsx (no breadcrumbs in flat model)
- view-stack.ts (no drill-down navigation)
- All old keyboard hooks: use-keyboard-controller.ts, use-keyboard-nav.ts, use-cancel-flow.ts, use-toggle-all.ts, use-graceful-shutdown.ts, and their barrel export

**Rewire App.tsx:** The new App.tsx (built in earlier features) replaces the old one entirely. Ensure no dead imports remain. The dashboard command entry point (commands/dashboard.ts) should work with the new App without changes to its startup sequence (alternate screen buffer, WatchLoop injection, etc).

**Preserve shared modules:** status-data.ts, log-format.ts, cancel-logic.ts, sdk-streaming.ts, sdk-message-mapper.ts, ring buffer, WatchLoop, and dispatch-tracker are all preserved. Verify no import paths broke after deletions.

**Verify status commands:** `beastmode status` (one-shot table) and `beastmode status --watch` (poll-refresh) must work exactly as before. They depend only on shared/status-data.ts and manifest-store.ts, neither of which change. Run existing tests to confirm.

**Update tests:** Remove or update any tests that reference deleted components. Ensure keyboard-nav.test.ts either migrates to test the new keyboard hook or is replaced with equivalent coverage for the new interaction model.

## Acceptance Criteria

- [ ] All listed old files deleted (EpicTable, FeatureList, AgentLog, ActivityLog, CrumbBar, view-stack, old hooks)
- [ ] No dead imports in any remaining file
- [ ] `beastmode status` prints correct one-shot table
- [ ] `beastmode status --watch` runs poll-refresh loop correctly
- [ ] `beastmode dashboard` launches and renders the new three-panel layout
- [ ] Existing tests for status, watch loop, and shared modules pass
- [ ] Old component tests removed or replaced with new panel test coverage
- [ ] key-hints.ts updated for new flat interaction model (no drill-down hints)
