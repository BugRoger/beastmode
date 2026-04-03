---
phase: plan
slug: dashboard-rework
epic: dashboard-rework
feature: details-panel
wave: 2
---

# Details Panel

**Design:** `.beastmode/artifacts/design/2026-04-03-dashboard-rework.md`

## User Stories

2. As a user, I want selecting an epic in the list to immediately update the details and log panels, so that I get context without extra keystrokes.
3. As a user, I want an "(all)" option in the epic list that shows an aggregate log stream and pipeline overview stats, so that I can monitor the entire pipeline at a glance.

## What to Build

Build the details panel that renders inside the right slot of the top section. This panel is entirely passive — it reacts to the currently selected epic from the epics panel.

**Two display modes based on selection:**

**"(all)" selected — Pipeline Overview:** Show aggregate statistics for the entire pipeline. Total epic count, counts by phase, and a phase breakdown table. Use the existing status-data.ts `buildStatusRows()` function to derive the data. Style with the design's phase colors.

**Single epic selected — Epic Details:** Display depends on the epic's current phase:
- For single-session phases (design, plan, validate, release): Show the epic name, current phase (color-coded), session status with a spinner if active, and elapsed time.
- For implement phase (multi-feature): Show the epic name, phase, and a feature list with each feature's name, wave number, and status (color-coded: pending=gray, in-progress=yellow, completed=green, blocked=red).

**Overflow handling:** When the feature list in implement phase exceeds the available panel height, the content scrolls within the panel. Supports up to 10 features per epic per the design's max capacity constraint.

**Data flow:** The details panel receives the full epics list and the current selection index as props. It derives its display content from these — no additional data fetching.

## Acceptance Criteria

- [ ] "(all)" selection shows pipeline overview with total counts and phase breakdown
- [ ] Single epic selection shows epic name, phase, and phase-appropriate detail
- [ ] Implement phase shows feature list with wave, name, and color-coded status
- [ ] Single-session phases show session status with spinner and elapsed time when active
- [ ] Feature list scrolls within panel when exceeding available height
- [ ] Panel updates immediately when epic selection changes (no delay, no transition)
- [ ] Phase colors consistent with design spec across all display modes
- [ ] Panel content derived from props only — no independent data fetching
