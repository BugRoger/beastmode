# Setup Subcommand

## Context
The GitHub infrastructure (labels, project board) needs one-time bootstrapping before any phase skill can write to GitHub. Must be idempotent for safe re-runs.

## Decision
New `/beastmode setup-github` subcommand that: (1) verifies gh auth and repo, (2) creates label taxonomy with `--force`, (3) creates or finds "Beastmode Pipeline" Projects V2 board, (4) configures board columns to match phases, (5) links repo to project. Routing added to `skills/beastmode/SKILL.md`.

## Rationale
Subcommand under `/beastmode` keeps setup discoverable alongside init/status/ideas. Idempotent design means re-running is safe. Existence checks before creation prevent duplicates.

## Source
state/plan/2026-03-28-github-state-model.md
