# Release v0.14.13

**Date:** 2026-03-06

## Highlights

Adds a visual progress language using Unicode block elements for at-a-glance workflow position and context health. Phase indicators show completed/current/pending phases with gradient density, and a full diagnostic context bar shows token usage breakdown at checkpoints.

## Features

- Visual language specification defining `█▓░▒` block-element vocabulary for progress displays
- Gradient density phase indicator at session start and phase announce (5 phases, block width matches name)
- Full diagnostic context bar with percentage, bar visualization, and token breakdown at checkpoints
- Phase indicator added to BEASTMODE.md Prime Directive for session start display
- Context report updated to use visual format with handoff guidance

## Full Changelog

All changes from `feature/visual-progress-language`:
- Created `skills/_shared/visual-language.md` — visual vocabulary specification
- Modified `skills/_shared/context-report.md` — references visual-language.md, uses visual format
- Modified `skills/design/phases/0-prime.md` — phase indicator in announce step
- Modified `skills/plan/phases/0-prime.md` — phase indicator in announce step
- Modified `skills/implement/phases/0-prime.md` — phase indicator in announce step
- Modified `skills/validate/phases/0-prime.md` — phase indicator in announce step
- Modified `skills/release/phases/0-prime.md` — phase indicator in announce step
- Modified `.beastmode/BEASTMODE.md` — phase indicator in Prime Directive
