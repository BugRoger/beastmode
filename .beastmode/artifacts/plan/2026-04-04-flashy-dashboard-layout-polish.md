---
phase: plan
slug: flashy-dashboard
epic: flashy-dashboard
feature: layout-polish
wave: 1
---

# Layout Polish

**Design:** .beastmode/artifacts/design/2026-04-04-flashy-dashboard.md

## User Stories

3. As a user, I want panel titles (EPICS, OVERVIEW, LOG) rendered inline with the border frame rather than on a separate line below it, so that the layout looks polished and doesn't waste vertical space.

5. As a user, I want the dashboard to auto-expand to fill the full terminal height, so that it uses all available screen real estate without manual sizing.

## What to Build

**Inline panel titles:** Replace the custom `PanelBox` component with `@mishieck/ink-titled-box`, a community package that renders titles embedded in the top border frame. This eliminates the separate title line that currently wastes vertical space. Panel titles are EPICS, OVERVIEW (renamed from DETAILS), and LOG.

**Dependency addition:** Add `@mishieck/ink-titled-box` to the project's package.json. Verify compatibility with Ink v6 during implementation — if incompatible, implement inline title rendering directly using Ink's Box border API with manual title insertion.

**Full terminal height:** The outer layout Box in ThreePanelLayout must receive an explicit `height` value equal to the terminal's row count. Use the existing `useTerminalSize` hook (already available in the codebase) to track terminal dimensions dynamically. Pass `rows` to the outer Box so the dashboard fills the full terminal on initial render and adapts to resize events. The `MinSizeGate` already handles undersized terminals.

**Title rename:** The right panel title changes from "DETAILS" to "OVERVIEW" to match the panel's new static content (covered by the overview-panel feature).

## Acceptance Criteria

- [ ] Panel titles (EPICS, OVERVIEW, LOG) render inline with the top border of each panel
- [ ] No separate title line wasting vertical space
- [ ] Dashboard fills the full terminal height on launch
- [ ] Dashboard adapts to terminal resize events (dynamic height tracking)
- [ ] MinSizeGate still blocks rendering when terminal is too small
- [ ] `@mishieck/ink-titled-box` installed and compatible with Ink v6 (or fallback inline title rendering implemented)
