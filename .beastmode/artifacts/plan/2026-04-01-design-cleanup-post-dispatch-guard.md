---
phase: plan
slug: design-cleanup
epic: design-cleanup
feature: post-dispatch-guard
wave: 1
---

# Post-Dispatch Guard

**Design:** .beastmode/artifacts/design/2026-04-01-c3cc89.md

## User Stories

4. As a pipeline operator, I want the watch loop to never dispatch plan on an epic that has no PRD

## What to Build

Add a secondary defense guard in the post-dispatch event mapping logic. Before the design phase branch generates a `DESIGN_COMPLETED` event for the state machine, verify that a design output artifact actually exists. If the output is missing, return early with an empty event list — preventing the state machine from advancing the epic to `plan` phase.

This guard is a safety net for edge cases where the primary gate in the phase command might be bypassed (e.g., the ReconcilingFactory path, or future code paths that call post-dispatch directly). It operates independently of the primary gate and makes no assumptions about cleanup having occurred.

The check uses the same `loadWorktreePhaseOutput()` function as the primary gate, maintaining a single source of truth for "did design produce output?"

## Acceptance Criteria

- [ ] `runPostDispatch()` with design phase and missing output produces zero events
- [ ] State machine never receives `DESIGN_COMPLETED` for a design with no output.json
- [ ] Normal design completion (output.json present) still sends `DESIGN_COMPLETED` normally
- [ ] Guard is purely additive — no changes to existing event generation for other phases
