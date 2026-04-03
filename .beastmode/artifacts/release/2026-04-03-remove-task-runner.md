---
phase: release
slug: a3d451
epic: remove-task-runner
bump: patch
---

# Release: remove-task-runner

**Bump:** patch
**Date:** 2026-04-03

## Highlights

Removes the task-runner orchestration layer from all phase skills, flattening each into a single self-contained SKILL.md. Cleans up all task-runner references from context docs.

## Chores

- Flatten 5 phase skills into single SKILL.md files — no more `phases/` subdirectories or `@` imports
- Remove `skills/task-runner.md` and all TodoWrite references from HARD-GATE blocks
- Delete `context/design/task-runner.md` and `context/design/task-runner/` directory
- Remove task-runner references from DESIGN.md, IMPLEMENT.md, and plan conventions
- Update `context/plan/structure/entry-points.md` to reflect self-contained skill model

## Full Changelog

- `39f04f0` design(remove-task-runner): checkpoint
- `e9556f3` plan(remove-task-runner): checkpoint
- `907ce81` implement(context-cleanup): checkpoint
- `7d6de54` implement(skill-flatten): checkpoint
- `9968380` validate(remove-task-runner): checkpoint
