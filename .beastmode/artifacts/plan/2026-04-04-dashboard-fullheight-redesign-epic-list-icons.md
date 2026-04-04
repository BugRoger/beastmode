---
phase: plan
slug: dashboard-fullheight-redesign
epic: dashboard-fullheight-redesign
feature: epic-list-icons
wave: 1
---

# Epic List Icons

**Design:** .beastmode/artifacts/design/2026-04-04-dashboard-fullheight-redesign.md

## User Stories

7. As a user, I want status-aware icons in the epic list (spinner for running, arrow for selected, dot for idle, dim for done/cancelled) with hex slug and phase badge, so that I can quickly scan epic state.

## What to Build

Redesign the epic row rendering in `EpicsPanel` to use compact status-aware icon rows instead of the current cursor + progress bar layout.

**Icon logic (priority order):**
- Selected epic: `>` in cyan (regardless of running state)
- Running but not selected: braille spinner in yellow (animated)
- Idle (not running, not done/cancelled): `·` colored by phase
- Done or cancelled: `·` dimmed

**Row format:** icon + space + hex slug + space + phase badge (phase name in phase color). No progress bar — progress info moves to the details panel.

**Phase badge:** The phase name rendered as colored text using the existing `PHASE_COLOR` map (design=magenta, plan=blue, implement=yellow, validate=cyan, release=green, done=green, cancelled=red).

**"(all)" row:** Retains current behavior — `>` when selected, space when not. No icon changes needed for this row.

**Spinner animation:** Reuses existing braille spinner frames (`SPINNER_FRAMES`). Only shown for running epics that are not currently selected.

**Tests:** Update `epics-panel.test.ts` to verify icon selection logic, phase badge rendering, and absence of progress bars.

## Acceptance Criteria

- [ ] Selected epic shows `>` in cyan as its icon
- [ ] Running (not selected) epic shows animated braille spinner in yellow
- [ ] Idle epic shows `·` colored by its current phase
- [ ] Done/cancelled epic shows dimmed `·`
- [ ] Each row displays: icon + hex slug + phase badge
- [ ] No progress bars in epic list rows
- [ ] "(all)" row rendering unchanged
- [ ] Phase badge uses correct color from PHASE_COLOR map
- [ ] Existing keyboard navigation unaffected
