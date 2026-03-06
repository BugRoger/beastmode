# Release v0.1.16

**Date:** 2026-03-04

## Highlights

Added task-runner shared utility that enforces step completion across all skills via TodoWrite tracking. Standardized all workflow skills to follow consistent 4-phase anatomy (0-prime → 1-execute → 2-validate → 3-checkpoint).

## Features

- **task-runner**: Shared utility parses markdown headings/lists into tasks with hierarchical tracking and validation-step reset support
- **skill-anatomy**: Standardize all workflow phases to 0-prime → 1-execute → 2-validate → 3-checkpoint
- **vision-alignment**: Restructure to .beastmode/ folder with 5-phase workflow (design → plan → implement → validate → release)
- **session-banner**: Display SessionStart hook banner with beastmode activation message
- **research-agent**: Simplified session banner and added research agent documentation

## Fixes

- Correct SessionStart hook configuration structure

## Chores

- Add local claude settings to gitignore
- Version bumps (0.1.14, 0.1.15)

## Cycle Artifacts

- Design: .agents/design/2026-03-04-task-runner.md
- Plan: .agents/plan/2026-03-04-task-runner.md
- Status: .agents/status/2026-03-04-task-runner.md

## Full Changelog

Compare: v0.1.12...v0.1.16
