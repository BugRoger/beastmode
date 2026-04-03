---
phase: plan
slug: dashboard-rework
epic: dashboard-rework
feature: epics-panel
wave: 1
---

# Epics Panel

**Design:** `.beastmode/artifacts/design/2026-04-03-dashboard-rework.md`

## User Stories

2. As a user, I want selecting an epic in the list to immediately update the details and log panels, so that I get context without extra keystrokes.
5. As a user, I want to filter epics by name using `/`, so that I can quickly find what I'm looking for in a busy pipeline.
6. As a user, I want to cancel an epic with `x` and an inline confirmation, so that I can stop work without leaving the dashboard.
7. As a user, I want the dashboard to show a clean placeholder when no sessions are active, so that the UI doesn't look broken when the pipeline is idle.

## What to Build

Build the interactive epics list panel that renders inside the left slot of the top section. This is the sole interactive panel in the dashboard — all keyboard input routes here.

**Epic list rendering:** Each row shows the epic slug, phase (color-coded per the design's phase color scheme), a progress bar (completed/total features), and status. An "(all)" entry sits at the top of the list, always present. The currently selected row uses inverse styling (white-on-cyan). Active epics show a spinning indicator. Rows for done/cancelled epics render dimmed.

**Selection model:** Up/down arrows move selection. Selection index is lifted to the parent App component so that details and log panels can react to which epic is selected. When "(all)" is selected, downstream panels show aggregate views.

**Keyboard handling:** Rebuild the keyboard system as a single hook for the new flat interaction model (no drill-down, no view stack). Keys:
- `q`/`Ctrl+C`: quit (graceful shutdown)
- `Up`/`Down`: navigate epic list
- `a`: toggle visibility of done/cancelled epics
- `x`: initiate cancel confirmation for selected epic
- `/`: enter filter mode

**Filter mode (k9s style):** Pressing `/` replaces the key hints bar at the bottom with an inline text prompt. User types a filter string, Enter applies it (filters epic list by name substring match), Escape clears the filter and exits filter mode. Not incremental — filter applies on Enter.

**Cancel flow:** Pressing `x` shows an inline confirmation in the key hints bar: "Cancel {slug}? y confirm n/esc abort". `y` executes cancellation using the existing shared cancel-logic module, `n`/Escape dismisses. While confirming, all other input is blocked.

**Toggle done/cancelled:** `a` toggles visibility of completed and cancelled epics. When hidden, selection index clamps to visible list.

**Empty state:** When no epics exist, render a dim centered placeholder "no epics" inside the panel.

**State management:** The new App.tsx manages: selected epic index, filter string, cancel confirmation state, show-all toggle, and watch loop event subscriptions. The epics panel is a presentational component receiving all state as props.

## Acceptance Criteria

- [ ] "(all)" entry appears at top of epic list, always visible
- [ ] Selecting an epic changes the selection index (lifted to App state)
- [ ] Phase colors match design spec (magenta=design, blue=plan, yellow=implement, cyan=validate, green=release/done, dim red=cancelled)
- [ ] Selected row renders with inverse (white-on-cyan) styling
- [ ] Active epics show spinning indicator
- [ ] Done/cancelled rows render dimmed
- [ ] `a` toggles done/cancelled visibility with correct index clamping
- [ ] `/` enters filter mode with inline prompt in key hints bar
- [ ] Filter applies on Enter, clears on Escape
- [ ] `x` shows inline cancel confirmation, `y` executes, `n`/Escape dismisses
- [ ] Cancel confirmation blocks all other input
- [ ] `q`/`Ctrl+C` triggers graceful shutdown
- [ ] Empty state shows "no epics" placeholder
- [ ] No view stack, no drill-down, no breadcrumbs — flat interaction model only
