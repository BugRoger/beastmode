---
phase: plan
slug: dashboard-polish
epic: dashboard-polish
feature: layout-restructure
wave: 3
---

# Layout Restructure

**Design:** `.beastmode/artifacts/design/2026-04-04-dashboard-polish.md`

## User Stories

2. As a user, I want a vertical split layout (LEFT: EPICS 60% + OVERVIEW 40% stacked at 35% width | RIGHT: LOG at 65% width full height), so the log panel has maximum vertical real estate for reading session output while epics and overview remain accessible.

6. As a user, I want the outer chrome border removed and panel titles rendered cleanly within their own PanelBox borders, so the "EPICS" and "OVERVIEW" labels no longer collide with stray border lines.

## What to Build

Restructure the dashboard layout from a horizontal top/bottom split to a vertical left/right split, and remove the outer chrome border:

- **Outer chrome removal:** Remove the wrapping Box with `borderStyle="single"` from the layout component. The header (banner + watch status) becomes a standalone element. The hints bar becomes a standalone element. Panel titles no longer collide with an outer frame.

- **Vertical split:** Replace the current top-row/bottom-row arrangement with a left-column/right-column split:
  - Left column at 35% width contains EPICS (60% height) stacked above OVERVIEW (40% height)
  - Right column at 65% width contains LOG at full height

- **Header and hints bar:** These remain full-width above and below the panel area, but are no longer inside a bordered container.

- **PanelBox updates:** PanelBox borders and titles now use Monokai Pro colors from the shared palette module (wave 2 output). Each panel renders its own complete border chrome — no reliance on an outer wrapper.

Update any existing layout tests that assert on the old top/bottom split proportions or the presence of the outer chrome border.

## Acceptance Criteria

- [ ] No outer chrome border wraps the dashboard
- [ ] Layout uses left/right column split (not top/bottom)
- [ ] Left column is 35% width
- [ ] Right column is 65% width
- [ ] EPICS panel takes 60% of left column height
- [ ] OVERVIEW panel takes 40% of left column height
- [ ] LOG panel fills full height of right column
- [ ] Panel titles ("EPICS", "OVERVIEW", "LOG") render within their own PanelBox borders without collision
- [ ] Header (banner + watch status) renders as standalone full-width element
- [ ] Hints bar renders as standalone full-width element
- [ ] Keyboard navigation still works correctly with new panel positions
- [ ] Layout degrades gracefully at minimum terminal size (80x24)
