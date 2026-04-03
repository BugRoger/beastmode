---
phase: release
slug: dashboard-rework
epic: dashboard-rework
bump: v0.66.0
---

# Release: dashboard-rework

**Version:** v0.66.0
**Date:** 2026-04-03

## Highlights

Full rewrite of the dashboard as a k9s-style three-panel split screen — epics list, details panel, and log panel visible simultaneously. Replaces the old drill-down navigation model with a single fullscreen view where selecting an epic filters details and logs in place.

## Features

- Three-panel layout with epics list (top-left), details (top-right), and log (bottom full-width)
- Epics panel with keyboard navigation, filtering (`/`), cancel (`x`), toggle done/cancelled (`a`)
- Details panel showing epic metadata, feature list with phase/status, and progress bars
- Log panel with auto-follow, epic-filtered or aggregate "(all)" log stream
- k9s-style cyan chrome with box-drawing borders and phase-colored status indicators
- Minimum terminal size enforcement (80x24) with friendly message
- Old dashboard components removed (view stack, push/pop navigation, breadcrumb bar, activity log)

## Full Changelog

- `design(dashboard-rework): checkpoint` — PRD and design decisions
- `plan(dashboard-rework): checkpoint` — Feature decomposition into 5 sub-plans
- `implement(dashboard-rework-three-panel-layout): checkpoint` — Base layout with border rendering
- `implement(dashboard-rework-epics-panel): checkpoint` — Interactive epics list
- `implement(dashboard-rework-details-panel): checkpoint` — Details display panel
- `implement(dashboard-rework-log-panel): checkpoint` — Log stream panel
- `implement(dashboard-rework-old-dashboard-cleanup): checkpoint` — Remove legacy dashboard code
- `validate(dashboard-rework): checkpoint` — 99 new tests passing, type-checked
