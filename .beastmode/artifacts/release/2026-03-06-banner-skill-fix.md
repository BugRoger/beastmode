# Release v0.14.6

**Date:** 2026-03-06

## Highlights

Fixes the session banner not printing when the user's first message is a skill invocation. The task-runner now owns banner display, eliminating the Prime Directive that skills were preempting.

## Fixes

- fix: banner not printing when session starts with a skill invocation (`/design`, `/plan`, etc.)
- fix: ANSI escape codes rendered as garbage in banner code blocks

## Full Changelog

- Added `## 1. Session Banner Check` to `skills/_shared/task-runner.md` (runs before task parsing)
- Removed redundant banner Prime Directive from `.beastmode/BEASTMODE.md`
- Renumbered task-runner steps (1→2, 2→3, 3→4, 4→5)
