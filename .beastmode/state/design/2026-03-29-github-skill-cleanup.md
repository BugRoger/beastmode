## Problem Statement

The v0.32.0 GitHub CLI migration deleted `skills/_shared/github.md` and cleaned `implement/phases/0-prime.md`, but left behind "Sync GitHub" sections in 5 checkpoint files that `@import` the deleted file. The `status` subcommand also moved to the CLI but was not removed from the skills. Additionally, stray github references in non-sync text and DESIGN.md context docs still describe behavior the skills no longer perform.

## Solution

Remove all orphaned GitHub sync logic from skill checkpoint files, delete the status subcommand, clean up stray github text references, and update DESIGN.md context to reflect that skills are no longer GitHub-aware (only `setup-github` remains as the bootstrap entry point).

## User Stories

1. As a skill author, I want checkpoint files to contain no dead `@import` references, so that Claude doesn't attempt to load a file that doesn't exist.
2. As a user, I want `/beastmode status` removed from the skill since it moved to the CLI, so that the skill's subcommand list matches reality.
3. As a skill author, I want DESIGN.md context to accurately describe the current GitHub integration boundary, so that future phases don't re-introduce sync logic in skills.

## Implementation Decisions

- Strip the entire "Sync GitHub" section from 5 checkpoint files: design, plan, implement, validate, release
- Renumber remaining checkpoint steps after removing the GitHub sync section
- Remove the parenthetical github reference in plan checkpoint ("e.g., `github` block from design checkpoint")
- Delete `skills/beastmode/subcommands/status.md` entirely
- Remove `status` routing and help text from `skills/beastmode/SKILL.md`
- Update `.beastmode/context/DESIGN.md` GitHub State Model section to reflect that skills are no longer GitHub-aware at checkpoint time
- Leave `skills/beastmode/subcommands/setup-github.md` untouched
- Leave `github.enabled` and `github.project-name` in config.yaml (setup-github uses them)

## Testing Decisions

- Grep sweep across `skills/` for any remaining `github.md`, `gh issue`, `gh api`, `gh project`, `gh label`, `Sync GitHub` references (excluding setup-github.md)
- Verify no dead `@import` directives remain
- Verify step numbering is sequential in all modified checkpoint files

## Out of Scope

- Migrating `setup-github.md` from gh CLI to MCP tools
- Modifying the CLI's GitHub sync engine
- Removing `github.enabled` / `github.project-name` from config.yaml
- Changes to manifest schema or CLI manifest types

## Further Notes

None

## Deferred Ideas

None
