---
phase: plan
slug: a3d451
epic: remove-task-runner
feature: context-cleanup
wave: 1
---

# Context Cleanup

**Design:** `.beastmode/artifacts/design/2026-04-03-a3d451.md`

## User Stories

4. As a contributor, I want stale task-runner references removed from context docs, so that the knowledge hierarchy accurately reflects the current system.

## What to Build

Remove all task-runner documentation from the knowledge hierarchy:

1. **Delete the L2 task-runner context file** at `context/design/task-runner.md` and its L3 subdirectory (`context/design/task-runner/` containing `lazy-expansion.md` and `validation-reset.md`).

2. **Remove the "Task Runner" section** from `context/DESIGN.md` (lines 22-24: the two ALWAYS/NEVER bullets about TodoWrite tracking and lazy expansion).

3. **Remove the task-runner reference** from `context/IMPLEMENT.md` (line 12: `task-runner integration` in the critical paths list).

4. **Update `context/plan/conventions.md`** — remove line 14 (`ALWAYS reference task-runner as first line inside HARD-GATE block`). Update surrounding convention rules to reflect the new SKILL.md structure (phases are inline headings, not numbered files with task-runner imports).

5. **Update `context/plan/structure/entry-points.md`** — rewrite the Decision and Rationale sections to reflect that SKILL.md is self-contained with inline phases, no task-runner import. Remove the source reference to `state/plan/2026-03-04-task-runner.md`.

## Acceptance Criteria

- [ ] `context/design/task-runner.md` deleted
- [ ] `context/design/task-runner/` directory deleted (including lazy-expansion.md and validation-reset.md)
- [ ] `context/DESIGN.md` has no "Task Runner" section
- [ ] `context/IMPLEMENT.md` has no task-runner reference in critical paths
- [ ] `context/plan/conventions.md` has no task-runner convention rule
- [ ] `context/plan/structure/entry-points.md` reflects self-contained SKILL.md model
- [ ] Grep for `task-runner` and `TodoWrite` across `context/` returns zero hits
