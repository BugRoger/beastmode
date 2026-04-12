---
phase: plan
epic-id: bm-3459
epic-slug: dashboard-spinner-bug-fixes-3459
feature-name: Spinner Shared Module
wave: 1
---

# Spinner Shared Module

**Design:** .beastmode/artifacts/design/2026-04-12-dashboard-spinner-bug-fixes-3459.md

## User Stories

1. As a user watching the dashboard, I want the epic spinner to rotate smoothly in one direction, so that it looks like a proper activity indicator instead of a pulsing dot.
2. As a user running a design session, I want the epic panel to show a spinner for my in-progress design epic, so that I can see it's active just like implement and other phases.
3. As a maintainer, I want spinner frames, interval, tick hook, and activation logic defined in one shared module, so that EpicsPanel and TreeView stay in sync without duplication.

## What to Build

### Shared spinner module

Create a new shared module that becomes the single source of truth for all spinner-related constants, hooks, and activation logic. This module exports:

- **EPIC_SPINNER** — forward-only frame array `["○", "◔", "◑", "◕", "●"]` (5 frames, no palindrome). Cycles cleanly at 120ms interval for a 600ms rotation.
- **FEATURE_SPINNER** — forward-only frame array `["◉", "◎", "○"]` (3 frames, no palindrome). Cycles cleanly at 120ms interval for a 360ms rotation.
- **SPINNER_INTERVAL_MS** — 120ms tick interval.
- **useSpinnerTick** — React hook that returns a monotonically incrementing tick counter, driven by a `setInterval` at `SPINNER_INTERVAL_MS`. Consumers index into frame arrays with `frames[tick % frames.length]`.
- **isActive** — Pure function that returns true for statuses representing active work: `"in-progress"`, `"implement"`, `"design"`, `"plan"`, `"validate"`, `"release"`.

### Rewire EpicsPanel

- Remove local `EPIC_SPINNER`, `FEATURE_SPINNER`, `SPINNER_INTERVAL_MS`, and `useSpinnerFrame` definitions.
- Import `EPIC_SPINNER`, `FEATURE_SPINNER`, `SPINNER_INTERVAL_MS`, `useSpinnerTick`, and `isActive` from the shared module.
- Replace `useSpinnerFrame()` call with `useSpinnerTick()`.
- Replace `activeSessions.has(epic.slug)` spinner guard with `isActive(epic.status)`. This is the critical fix that enables design-phase epics to show the spinner.
- Preserve the `activeSessions` prop on `EpicsPanelProps` — it's still consumed upstream for view filtering and session count display.

### Rewire TreeView

- Remove local `EPIC_SPINNER`, `FEATURE_SPINNER`, `SPINNER_INTERVAL_MS`, `useSpinnerTick`, and `isActive` definitions.
- Import all five from the shared module.
- No logic changes needed — TreeView already uses the correct phase-based activation.

### Unit tests

- Verify `EPIC_SPINNER` contains no repeated subsequence (forward-only, no palindrome).
- Verify `FEATURE_SPINNER` contains no repeated subsequence (forward-only, no palindrome).
- Verify `isActive` returns true for all six active statuses (`"in-progress"`, `"implement"`, `"design"`, `"plan"`, `"validate"`, `"release"`).
- Verify `isActive` returns false for terminal/inactive statuses (e.g., `"completed"`, `"blocked"`, `"pending"`).

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Forward-only `EPIC_SPINNER` with 5 frames, no palindrome pattern
- [ ] Forward-only `FEATURE_SPINNER` with 3 frames, no palindrome pattern
- [ ] `isActive()` returns true for `"design"` status (and all other active phases)
- [ ] EpicsPanel uses `isActive(epic.status)` for spinner activation instead of `activeSessions.has(epic.slug)`
- [ ] Both EpicsPanel and TreeView import spinner constants, hook, and activation logic from the shared module — no local definitions remain
- [ ] `activeSessions` prop preserved on EpicsPanelProps (still used for view filtering)
- [ ] Existing EpicsPanel and TreeView tests continue to pass
- [ ] New unit tests verify frame array correctness and `isActive` coverage
