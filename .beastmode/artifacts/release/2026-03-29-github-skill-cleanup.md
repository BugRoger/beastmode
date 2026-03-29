# Release: github-skill-cleanup

**Version:** v0.38.0
**Date:** 2026-03-29

## Highlights

Completes the v0.32.0 GitHub CLI migration by removing all orphaned GitHub sync logic from skill checkpoint files and deleting the status subcommand that moved to the CLI.

## Chores

- Removed orphaned "Sync GitHub" sections and `@../_shared/github.md` imports from 5 checkpoint files (design, plan, implement, validate, release)
- Deleted `skills/beastmode/subcommands/status.md` (moved to CLI in v0.32.0)
- Removed `status` routing and help text from `skills/beastmode/SKILL.md`
- Cleaned stray GitHub references from plan checkpoint parenthetical
- Updated `.beastmode/context/DESIGN.md` GitHub State Model section to reflect skills are no longer GitHub-aware
- Renumbered checkpoint steps in all 5 modified files

## Full Changelog

- `design(github-skill-cleanup): checkpoint`
- `plan(github-skill-cleanup): checkpoint`
- `implement(github-skill-cleanup): checkpoint`
- `validate(github-skill-cleanup): checkpoint`
