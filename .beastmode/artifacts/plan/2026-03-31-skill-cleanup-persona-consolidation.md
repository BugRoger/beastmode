---
phase: plan
epic: skill-cleanup
feature: persona-consolidation
---

# Persona Consolidation

**Design:** `.beastmode/artifacts/design/2026-03-31-skill-cleanup.md`

## User Stories

1. As a skill author, I want persona loaded once via L0, so that skills don't carry redundant imports
3. As a skill author, I want greeting context in BEASTMODE.md, so that persona behavior survives persona.md deletion

## What to Build

The persona is already loaded globally via BEASTMODE.md's L0 autoload. The shared persona.md file contains two sections not yet in BEASTMODE.md: context-awareness rules (time-of-day and project-state greeting behavior) and skill-announce guidance. These sections must be merged into the existing Persona section of BEASTMODE.md before the file can be deleted.

All five skill 0-prime.md files contain an `@../_shared/persona.md` import line that must be removed. The import is always a standalone line — no surrounding logic depends on it.

After merging and removing imports, delete the persona.md file from _shared/.

## Acceptance Criteria

- [ ] BEASTMODE.md Persona section contains context-awareness rules (time-of-day, project-state greeting behavior)
- [ ] BEASTMODE.md Persona section contains skill-announce guidance
- [ ] All 5 skill 0-prime.md files have no `@../_shared/persona.md` import
- [ ] `skills/_shared/persona.md` is deleted
- [ ] `grep -r "persona.md" skills/` returns no matches
