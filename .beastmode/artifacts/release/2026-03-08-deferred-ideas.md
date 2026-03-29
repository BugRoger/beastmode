# Release: deferred-ideas

**Version:** v0.14.29
**Date:** 2026-03-08

## Highlights

Consolidated `/beastmode` into a unified command with `init`, `status`, and `ideas` subcommands. Standalone `/status` skill removed. New deferred ideas reconciliation walks design docs and marks implemented items via LLM matching.

## Features

- **Unified /beastmode command** — Single entry point with `init`, `status`, `ideas` subcommands; flat depth, no flags
- **Phase-grouped status** — `/beastmode status` shows active features grouped by workflow phase (design/plan/implement/validate) with worktree detection
- **Deferred ideas capture** — `/beastmode ideas` walks design docs for `## Deferred Ideas` sections, reconciles against skill files via semantic matching, marks implemented items with strikethrough
- **Auto-detect init mode** — `init` subcommand auto-selects greenfield/brownfield based on project state; flags still available as overrides
- **Auto-install on init** — If `.beastmode/` skeleton doesn't exist, `init` installs it automatically before proceeding

## Chores

- Removed standalone `/status` skill (folded into `/beastmode status`)
- Removed `install` subcommand (folded into `init` preconditions)
- Updated README skills table and install instructions

## Artifacts

- Design: .beastmode/state/design/2026-03-08-deferred-ideas.md
- Plan: .beastmode/state/plan/2026-03-08-deferred-ideas.md
- Validate: .beastmode/state/validate/2026-03-08-deferred-ideas.md
