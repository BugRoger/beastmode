---
phase: plan
slug: dashboard-rework
epic: dashboard-rework
feature: three-panel-layout
wave: 1
---

# Three-Panel Layout

**Design:** `.beastmode/artifacts/design/2026-04-03-dashboard-rework.md`

## User Stories

1. As a user, I want to see all my epics, their details, and live logs on a single screen, so that I don't have to navigate between views to understand pipeline state.
4. As a user, I want the log panel to take most of the screen (~65%), so that I can follow session activity in detail.
8. As a user, I want the dashboard to enforce a minimum terminal size (80x24) with a friendly message, so that the layout doesn't render as garbage in a tiny terminal.
10. As a user, I want the dashboard to look visually pleasing with k9s-style cyan borders, phase-colored status indicators, and clean typography, so that monitoring the pipeline is not an eyesore.

## What to Build

Replace the current drill-down App.tsx with a new root component that renders a fixed three-panel split screen layout:

**Outer chrome:** A full-terminal box drawn with single-line box-drawing characters (`┌─┐│└┘┬├┤┴`) in cyan. Watch status ("watch: running"/"watch: stopped" with green/red coloring) and a clock rendered in the top-right corner of the outer border.

**Top section (~35% of terminal height):** Horizontal split into two panels:
- Left panel (~30% width): Slot for the epics list. Panel title inset in top border: `─── EPICS ───`
- Right panel (~70% width): Slot for the details view. Panel title inset in top border: `─── DETAILS ───`

**Bottom section (~65% of terminal height):** Full-width panel for the log stream. Panel title inset in top border: `─── LOG ───`

**Bottom bar:** Single line for key hints and filter/cancel prompts, outside the bordered area.

**Minimum terminal size gate:** Before rendering the three-panel layout, check terminal dimensions. If below 80x24, render a centered "terminal too small (need 80x24)" message instead of the dashboard.

**Terminal resize handling:** React to terminal resize events and re-check minimum size constraint. Panels use Ink's flexbox layout (percentage-based) so they resize naturally.

The three panels are empty slots at this stage — they accept children or render placeholder content. The epics panel, details panel, and log panel features will fill these slots.

## Acceptance Criteria

- [ ] Dashboard renders three distinct bordered panels in the correct proportions (~35/65 vertical, ~30/70 horizontal in top)
- [ ] All borders use single-line box-drawing characters in cyan
- [ ] Panel titles ("EPICS", "DETAILS", "LOG") appear inset in their respective top borders
- [ ] Watch status and clock appear in top-right corner of outer border
- [ ] Key hints bar renders at the bottom
- [ ] Terminals below 80x24 show "terminal too small" message instead of the layout
- [ ] Terminal resize correctly re-evaluates minimum size constraint
- [ ] No new dependencies added — uses Ink Box, Text, and Yoga flexbox only
