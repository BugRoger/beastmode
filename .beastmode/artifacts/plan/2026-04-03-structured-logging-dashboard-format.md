---
phase: plan
slug: 4e943a
epic: structured-logging
feature: dashboard-format
wave: 3
---

# Dashboard Format

**Design:** `.beastmode/artifacts/design/2026-04-03-4e943a.md`

## User Stories

5. As a developer using the dashboard, I want the activity log panel to use the same visual format as the CLI logger, so that the output looks consistent regardless of which surface I'm reading.

## What to Build

Wire the shared format function into the dashboard's ActivityLog component so that both CLI and dashboard output use identical visual formatting.

**ActivityLog integration** — replace the current per-event-type color mapping and manual string formatting with calls to the shared `formatLogLine()` function. The function returns chalk-colored ANSI strings, which Ink's `<Text>` component renders directly.

**Event-to-context mapping** — map DashboardEvent fields to format function parameters. The WatchLoop events already carry epicSlug, featureSlug, and phase — thread these through the event-to-DashboardEvent conversion in App.tsx so ActivityLog can pass them to formatLogLine().

**Level mapping** — map event types to log levels: dispatched/scan → INFO, completed → INFO, error → ERR. This replaces the current color-per-type approach with level-driven coloring from the shared format.

**Consistent rendering** — both surfaces (terminal logger output and dashboard activity panel) produce visually identical lines for the same event. The format function is the single source of truth for visual layout.

## Acceptance Criteria

- [ ] ActivityLog renders lines using the shared formatLogLine() function
- [ ] DashboardEvent carries phase, epic, and feature context fields
- [ ] Event types map to appropriate log levels (INFO, ERR)
- [ ] Dashboard activity lines are visually identical to CLI logger output for the same events
- [ ] Ink `<Text>` correctly renders chalk ANSI strings from formatLogLine()
- [ ] No duplicate color logic remains in ActivityLog — all coloring comes from the shared format
