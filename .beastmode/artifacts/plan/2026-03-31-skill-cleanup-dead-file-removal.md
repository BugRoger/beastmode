---
phase: plan
epic: skill-cleanup
feature: dead-file-removal
---

# Dead File Removal

**Design:** `.beastmode/artifacts/design/2026-03-31-skill-cleanup.md`

## User Stories

2. As a contributor, I want dead template files removed, so that the shared directory isn't misleading

## What to Build

Two template files in `skills/_shared/` are not imported by any skill: `0-prime-template.md` and `3-checkpoint-template.md`. Delete both.

Additionally, `skills/design/phases/3-checkpoint.md` contains a dangling `@../_shared/retro.md` import referencing a file that no longer exists. Remove that import line.

## Acceptance Criteria

- [ ] `skills/_shared/0-prime-template.md` is deleted
- [ ] `skills/_shared/3-checkpoint-template.md` is deleted
- [ ] `skills/design/phases/3-checkpoint.md` has no `@../_shared/retro.md` import
- [ ] `grep -r "0-prime-template\|3-checkpoint-template\|retro.md" skills/` returns no matches
