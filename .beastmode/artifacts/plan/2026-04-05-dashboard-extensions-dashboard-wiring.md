---
phase: plan
slug: dashboard-extensions
epic: dashboard-extensions
feature: dashboard-wiring
wave: 3
---

# Dashboard Wiring

**Design:** `.beastmode/artifacts/design/2026-04-05-dashboard-extensions.md`

## User Stories

1-12. All user stories (integration wiring). This feature connects all wave 1 and wave 2 features through the dashboard's integration layer.

## What to Build

**App.tsx state wiring:** Wire the new keyboard state fields into the dashboard's root component:

- `focusedPanel` — passed to `ThreePanelLayout` for border color selection
- `phaseFilter` — applied as a filter to the tree state before passing to `LogPanel`
- `showBlocked` — applied as a filter to both the tree state (log panel) and the epic list (epics panel)
- `logScrollOffset` / `logAutoFollow` — passed to `LogPanel` for scroll rendering
- `detailsScrollOffset` — passed to the details panel for content scrolling
- Nyan tick state — lifted from `NyanBanner` into App.tsx, passed to both `NyanBanner` (as prop) and `ThreePanelLayout` (for border color computation)

**ThreePanelLayout updates:**

- Accept `focusedPanel` and `nyanTick` props
- Compute focused border color: `NYAN_PALETTE[nyanTick % 256]`
- Pass `borderColor` to the focused `PanelBox`, `undefined` to unfocused ones
- Change the overview panel title from `"OVERVIEW"` to `"DETAILS"`
- Pass `NyanBanner` the tick as a prop instead of letting it manage its own timer

**LogPanel scroll rendering:** Replace the current "render everything then trim" model with offset-based rendering:

- Accept `scrollOffset` and `autoFollow` props
- When `autoFollow` is true, render from the bottom (last N lines that fit)
- When `autoFollow` is false, render from `scrollOffset` position
- The panel measures its available height and renders exactly that many lines from the computed position

**Phase filter application:** Before passing tree state to LogPanel, filter entries by `phaseFilter`. When `phaseFilter` is `'all'`, no filtering. Otherwise, only entries with matching `TreeEntry.phase` are shown. Epic and feature skeleton nodes remain visible even if all their entries are filtered (preserves hierarchy context).

**Blocked filter application:** Before passing tree state to LogPanel, filter out blocked epic/feature nodes when `showBlocked` is false. Also filter the epics list passed to EpicsPanel.

**Epic selection → details panel:** The selection state now distinguishes between "(all)", epic, and feature selection. Pass the appropriate selection type and slugs to the details panel so it can load the correct content.

**NyanBanner refactor:** Accept an optional `tick` prop. When provided, use it instead of internal timer state. This allows App.tsx to own the tick and share it with both the banner and the layout.

## Integration Test Scenarios

<!-- No behavioral scenarios produced for this feature — integration wiring is covered by the behavioral tests of features it connects -->

## Acceptance Criteria

- [ ] App.tsx wires all new keyboard state to child components
- [ ] Nyan tick state lifted to App.tsx and shared with NyanBanner + ThreePanelLayout
- [ ] Focused panel receives animated border color from NYAN_PALETTE
- [ ] Unfocused panels use default CHROME.border
- [ ] Phase filter applied to tree state before LogPanel rendering
- [ ] Blocked filter applied to tree state and epic list
- [ ] LogPanel renders from scroll offset (not trimmed)
- [ ] Auto-follow shows newest entries; manual scroll shows from offset
- [ ] Details panel receives selection state (all/epic/feature) with correct slugs
- [ ] ThreePanelLayout title changed from "OVERVIEW" to "DETAILS"
- [ ] NyanBanner accepts optional tick prop for shared state
- [ ] All 12 user stories functional end-to-end
