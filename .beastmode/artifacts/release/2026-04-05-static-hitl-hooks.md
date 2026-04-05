---
phase: release
slug: static-hitl-hooks
epic: static-hitl-hooks
bump: minor
---

# Release: static-hitl-hooks

**Bump:** minor
**Date:** 2026-04-05

## Highlights

Replaces prompt-based HITL hooks with static command-type hooks and adds a standalone hitl-auto.ts script for autonomous auto-answer, eliminating the fragile prompt injection approach.

## Features

- Change hook builder to command-type, delete buildPrompt (`c574a96d`)
- Add hitl-auto.ts static auto-answer script (`147776ef`)

## Fixes

- Fix BDD script path resolution and remove duplicate step (`997245aa`)

## Chores

- Refactor call sites to new buildPreToolUseHook(phase) signature (`8987520f`)
- Update BDD scenarios and steps for command-type hooks (`86296ad3`)
- Add BDD integration tests for static HITL hooks (`bde4fe9b`)

## Full Changelog

```
7273c29f validate(static-hitl-hooks): checkpoint
274f4972 implement(static-hitl-hooks-static-hitl-hooks): checkpoint
997245aa fix(static-hitl-hooks): fix BDD script path resolution and remove duplicate step
86296ad3 test(static-hitl-hooks): update BDD scenarios and steps for command-type hooks
8987520f refactor(static-hitl-hooks): update call sites to new buildPreToolUseHook(phase) signature
c574a96d feat(static-hitl-hooks): change hook builder to command-type, delete buildPrompt
147776ef feat(static-hitl-hooks): add hitl-auto.ts static auto-answer script
bde4fe9b test(static-hitl-hooks): add BDD integration tests for static HITL hooks
3ed76dee plan(static-hitl-hooks): checkpoint
c2fa7492 design(static-hitl-hooks): checkpoint
```
