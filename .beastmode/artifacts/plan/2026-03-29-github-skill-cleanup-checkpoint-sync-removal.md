# Checkpoint Sync Removal

**Design:** .beastmode/state/design/2026-03-29-github-skill-cleanup.md

## User Stories

1. As a skill author, I want checkpoint files to contain no dead `@import` references, so that Claude doesn't attempt to load a file that doesn't exist.

## What to Build

Remove the entire "Sync GitHub" section from each of the 5 checkpoint files (design, plan, implement, validate, release). This includes the `@../_shared/github.md` import, all `gh` CLI commands, manifest mutation logic, and surrounding prose. After removal, renumber remaining checkpoint steps to be sequential. Additionally, remove the parenthetical github reference in the plan checkpoint's manifest-write step ("e.g., `github` block from design checkpoint").

## Acceptance Criteria

- [ ] No `@../_shared/github.md` import in any checkpoint file
- [ ] No "Sync GitHub" section header in any checkpoint file
- [ ] No `gh issue`, `gh api`, `gh project`, or `gh label` commands in any checkpoint file (excluding setup-github.md)
- [ ] Step numbering is sequential in all 5 modified checkpoint files
- [ ] Plan checkpoint manifest-write step no longer references the github block parenthetical
- [ ] Grep sweep across `skills/` confirms zero orphaned github references (excluding setup-github.md and SKILL.md's setup-github route)
