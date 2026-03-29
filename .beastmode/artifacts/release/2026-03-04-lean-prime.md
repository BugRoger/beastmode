# Release v0.3.2

**Date:** 2026-03-04

## Highlights

Refactored all workflow skill phases to enforce a clean separation: 0-prime is now purely read-only (loads context) and 1-execute owns all side effects (worktree creation/entry first, then skill-specific work).

## Features

- Slimmed shared prime template — removed worktree entry logic
- /design: prime reads only; execute creates worktree as step 1, then explores and asks questions
- /plan: prime reads only; execute enters worktree as step 1, then explores codebase
- /implement: prime reads only; execute enters worktree as step 1, then prepares env and runs tasks
- /validate: prime reads only; execute enters worktree as step 1, then runs quality checks
- /release: prime reads artifacts only; execute enters worktree as step 1, then determines version
- Architecture doc updated with sub-phase anatomy descriptions

## Full Changelog

12 files changed, 155 insertions, 163 deletions across skills/_shared/, skills/*/phases/, and .beastmode/context/design/architecture.md
