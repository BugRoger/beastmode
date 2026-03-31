---
phase: design
slug: skill-cleanup
---

## Problem Statement

Dead shared files and redundant persona imports clutter the skills directory. The persona is loaded via BEASTMODE.md L0 autoload, making per-skill `@persona.md` imports redundant. Two template files (`0-prime-template.md`, `3-checkpoint-template.md`) are not imported by any skill. A dangling `@retro.md` import exists in design's checkpoint. After cleanup, `_shared/` would contain a single file, which is pointless.

## Solution

Delete 3 dead shared files, remove persona imports from all 5 skills, merge persona context-awareness content into BEASTMODE.md, flatten the `_shared/` directory by moving `task-runner.md` to `skills/` root, and clean up the dangling retro.md import in design's checkpoint.

## User Stories

1. As a skill author, I want persona loaded once via L0, so that skills don't carry redundant imports
2. As a contributor, I want dead template files removed, so that the shared directory isn't misleading
3. As a skill author, I want greeting context in BEASTMODE.md, so that persona behavior survives persona.md deletion
4. As a contributor, I want a flat skills directory, so that a single-file `_shared/` doesn't exist for no reason

## Implementation Decisions

- Delete `skills/_shared/persona.md` after merging its context-awareness and skill-announce sections into BEASTMODE.md's Persona section
- Delete `skills/_shared/0-prime-template.md` — dead scaffolding, no skill imports it
- Delete `skills/_shared/3-checkpoint-template.md` — dead scaffolding, no skill imports it
- Remove `@../_shared/persona.md` import line from all 5 `0-prime.md` files (design, plan, implement, validate, release)
- Remove dangling `@../_shared/retro.md` import from `skills/design/phases/3-checkpoint.md`
- Move `skills/_shared/task-runner.md` to `skills/task-runner.md`
- Update all 5 `SKILL.md` files: change `@_shared/task-runner.md` to `@../task-runner.md`
- Delete the now-empty `skills/_shared/` directory
- No agent deletions — all 8 agents are actively used

## Testing Decisions

- Verify no remaining references to deleted files (grep for `persona.md`, `0-prime-template`, `3-checkpoint-template`, `retro.md` in skills/)
- Verify all 5 SKILL.md files correctly reference the new task-runner.md path
- Verify BEASTMODE.md contains the merged persona context-awareness content

## Out of Scope

- Agent cleanup (all 8 confirmed active)
- Changes to task-runner.md content
- Changes to individual skill phase logic
- Retro system redesign

## Further Notes

None

## Deferred Ideas

None
