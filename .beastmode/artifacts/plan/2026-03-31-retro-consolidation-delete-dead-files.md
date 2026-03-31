---
phase: plan
epic: retro-consolidation
feature: delete-dead-files
---

# Delete Dead Files

**Design:** .beastmode/artifacts/design/2026-03-31-retro-consolidation.md

## User Stories

1. As a skill author, I want checkpoint phases to only commit and hand off, so that skills are simpler and faster.
2. As a pipeline operator, I want retro to run once at release with all phase artifacts, so that the knowledge hierarchy gets a coherent full-cycle update instead of five fragmented passes.

## What to Build

Delete two files that are no longer referenced after the retro consolidation:

1. **`skills/_shared/retro.md`** — the shared retro orchestrator. After `strip-phase-retro` removes its imports from 4 checkpoints and `inline-release-retro` replaces its import in the release checkpoint, this file has zero consumers.

2. **`agents/retro-meta.md`** — the meta walker agent. After `inline-release-retro` removes the meta walker spawn and `meta-tree-migration` deletes the meta/ tree it operated on, this agent has no purpose.

Verify that `agents/retro-context.md` is NOT deleted — it is still used by the inlined release retro.

This feature should run last or near-last, after the import removals and rewrites are complete, to ensure the files are truly dead.

## Acceptance Criteria

- [ ] `skills/_shared/retro.md` is deleted
- [ ] `agents/retro-meta.md` is deleted
- [ ] `agents/retro-context.md` still exists and is unchanged
- [ ] No remaining references to `retro-meta.md` anywhere in the codebase
- [ ] No remaining `@../_shared/retro.md` imports anywhere in the codebase
