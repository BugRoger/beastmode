---
phase: release
slug: skill-cleanup
bump: patch
---

# Release: skill-cleanup

**Version:** v0.54.2
**Date:** 2026-03-31

## Highlights

Removes dead shared files, eliminates redundant persona imports from all 5 skills, merges persona context-awareness into BEASTMODE.md, and flattens `_shared/` by moving `task-runner.md` to the skills root.

## Chores

- Delete 3 dead shared files: `persona.md`, `0-prime-template.md`, `3-checkpoint-template.md`
- Remove `@../_shared/persona.md` import from all 5 skill prime phases
- Remove dangling `@../_shared/retro.md` import from design checkpoint
- Merge persona context-awareness and skill-announce sections into BEASTMODE.md
- Move `task-runner.md` from `skills/_shared/` to `skills/` root
- Update all 5 SKILL.md task-runner import paths
- Delete now-empty `skills/_shared/` directory

## Full Changelog

- `0aebf85` design(skill-cleanup): checkpoint
- `26bf4a6` plan(skill-cleanup): checkpoint
- `bdfb895` implement(dead-file-removal): checkpoint
- `9d1feb8` implement(persona-consolidation): checkpoint
- `18eb2db` implement(directory-flatten): checkpoint
- `aa502bf` validate(skill-cleanup): checkpoint
