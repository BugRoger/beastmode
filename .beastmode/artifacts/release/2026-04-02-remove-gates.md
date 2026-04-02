---
phase: release
slug: remove-gates
epic: remove-gates
bump: minor
---

# Release: remove-gates

**Bump:** minor
**Date:** 2026-04-02

## Highlights

Removes the gate mechanism entirely — `[GATE|...]` / `[GATE-OPTION|...]` syntax from skills, `GatesConfig` / `resolveGateMode()` / `checkBlocked()` from CLI, `gates:` from config.yaml. Design phase inlines interactive behavior directly; all other phases just run.

## Features

- Remove `[GATE|...]` and `[GATE-OPTION|...]` syntax from all skill phase files
- Remove gate detection block from task-runner
- Remove `GatesConfig` types, `resolveGateMode()`, gate-checking logic from CLI
- Remove `gates:` section from config.yaml
- Inline design phase interactive behavior (no gate branching)
- Inline auto behavior as sole code path for non-design phases
- Update context docs (DESIGN.md, BEASTMODE.md) to remove gate references

## Chores

- Remove dead code (sdk-runner, run-log) and consolidate test dirs
- Gitignore artifact output.json files

## Full Changelog

- `02cd193` validate(remove-gates): checkpoint
- `b32a729` implement(cli-degating): checkpoint
- `ff1c77d` implement(remove-gates): degate context docs, L0, and user-facing gate docs
- `ef1bd3e` implement(remove-gates): save skill-degating task output
- `62f8a14` implement(remove-gates): degate all skill phase files, task-runner, and agent
- `c6341d4` plan(remove-gates): checkpoint
- `a4f6e5d` plan(remove-gates): checkpoint
- `04c3362` design(remove-gates): checkpoint
- `f61c143` design(remove-gates): checkpoint
- `1516db2` chore: gitignore artifact output.json files
- `7380751` chore: remove dead code (sdk-runner, run-log) and consolidate test dirs
