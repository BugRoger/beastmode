# Release v0.14.9

**Date:** 2026-03-06

## Highlights

Third attempt at fixing the session banner. The instruction now lives in BEASTMODE.md (L0, autoloaded) instead of behind a task-runner @import that never fires.

## Fixes

- Move banner display instruction from task-runner.md Step 1 to BEASTMODE.md Prime Directives
- Remove dead Session Banner Check from task-runner.md (the @import indirection never auto-expanded)
- Renumber task-runner steps from 5 to 4

## Full Changelog

- fix: move banner Prime Directive to BEASTMODE.md L0
- fix: remove non-functional Session Banner Check from task-runner.md
