---
phase: plan
epic: skill-cleanup
feature: directory-flatten
---

# Directory Flatten

**Design:** `.beastmode/artifacts/design/2026-03-31-skill-cleanup.md`

## User Stories

4. As a contributor, I want a flat skills directory, so that a single-file `_shared/` doesn't exist for no reason

## What to Build

After persona-consolidation and dead-file-removal complete, the only remaining file in `skills/_shared/` is `task-runner.md`. Move it up one level to `skills/task-runner.md`.

All five skill SKILL.md files reference `@_shared/task-runner.md` in their HARD-GATE block. Update each reference to `@../task-runner.md` (since SKILL.md files live at `skills/{verb}/SKILL.md`, the new path is one level up to `skills/task-runner.md`).

Delete the now-empty `skills/_shared/` directory.

Update the PLAN.md convention that references `skills/_shared/` to reflect the new location.

## Acceptance Criteria

- [ ] `skills/task-runner.md` exists at the new location
- [ ] All 5 SKILL.md files reference `@../task-runner.md` (not `@_shared/task-runner.md`)
- [ ] `skills/_shared/` directory no longer exists
- [ ] `grep -r "_shared/task-runner" skills/` returns no matches
- [ ] PLAN.md conventions updated to reflect new task-runner location
