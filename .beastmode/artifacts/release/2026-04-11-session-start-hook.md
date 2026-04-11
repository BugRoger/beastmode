---
phase: release
slug: session-start-hook
epic: session-start-hook
bump: minor
---

# Release: session-start-hook

**Version:** v0.109.0
**Date:** 2026-04-11

## Highlights

Adds a SessionStart hook that assembles phase context automatically at session start, replacing the manual Phase 0 prime step in all five workflow skills.

## Features

- Add core assembleContext function and unit tests
- Register session-start in command router
- Wire hooks router to real assembleContext module
- Add SessionStart settings writer functions
- Wire SessionStart hook into phase.ts and runner.ts
- Add integration test for SessionStart hook
- Strip Phase 0 from design skill
- Strip Phase 0 from plan skill
- Strip Phase 0 from implement skill
- Strip Phase 0 from validate skill
- Strip Phase 0 from release skill

## Fixes

- Update hooks-command tests for real assembleContext

## Full Changelog

```
1df3ee2a validate(session-start-hook): checkpoint (#481)
350a1c66 implement(session-start-hook-cli-integration): checkpoint
1af22e12 implement(session-start-hook-hook-implementation): checkpoint
5e91984c implement(session-start-hook-hook-implementation): checkpoint
3c0fdc81 fix(session-start-hook): update hooks-command tests for real assembleContext
3acf7482 test(session-start-hook): add integration test for SessionStart hook
11dc379b feat(session-start-hook): wire SessionStart hook into phase.ts and runner.ts
81fa6821 feat(session-start-hook): add SessionStart settings writer functions
30f07587 feat(session-start-hook): wire hooks router to real assembleContext module
1d6c3540 feat(session-start-hook): register session-start in command router
2a4640d3 implement(session-start-hook-skill-prime-removal): checkpoint
2b149cae feat(skill-prime-removal): strip Phase 0 from release skill
f12263be feat(skill-prime-removal): strip Phase 0 from validate skill
e4942429 feat(skill-prime-removal): strip Phase 0 from implement skill
61c6b04b feat(skill-prime-removal): strip Phase 0 from plan skill
633b9f8b feat(skill-prime-removal): strip Phase 0 from design skill
69c51d67 feat(session-start-hook): register session-start in command router
bd6e6655 feat(session-start-hook): add core assembleContext function and unit tests
f40726d2 feat(skill-prime-removal): strip Phase 0 from release skill
84743a2b plan(session-start-hook): checkpoint
c5a6e4bb design(session-start-hook): checkpoint (#481)
```
