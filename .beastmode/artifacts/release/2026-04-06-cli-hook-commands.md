---
phase: release
slug: cli-hook-commands
epic: cli-hook-commands
bump: minor
---

# Release: cli-hook-commands

**Bump:** minor
**Date:** 2026-04-06

## Highlights

Replaces absolute hook paths with portable CLI commands (`bunx beastmode hooks ...`) in all settings builders, making hook configuration work across machines and worktrees without path fixups.

## Features

- feat(hooks-command): update settings builders to emit bunx commands (#455)
- feat(portable-settings): update file-permission builder to emit CLI commands (#456)
- feat(hooks-command): wire hooks into CLI entry point (#455)
- feat(hooks-command): add hooks dispatch command module (#455)
- feat(portable-settings): update HITL builders to emit CLI commands (#456)

## Fixes

- fix(hooks-command): use git-initialized temp dirs for hitl-auto integration tests (#454)
- fix(portable-settings): update hitl-prompt tests for CLI commands (#454)

## Chores

- refactor(portable-settings): delete obsolete absolute-hook-paths BDD test (#454)
- refactor(hooks-command): remove import.meta.main from hook modules (#454)

## Full Changelog

- 37abf995 validate(cli-hook-commands): checkpoint (#454)
- 6baac065 implement(cli-hook-commands-hooks-command): checkpoint (#454)
- 6eb06564 fix(hooks-command): use git-initialized temp dirs for hitl-auto integration tests (#454)
- 22ab97e5 feat(hooks-command): update settings builders to emit bunx commands (#455)
- ca6994b0 implement(cli-hook-commands-portable-settings): checkpoint (#454)
- a5adc271 refactor(portable-settings): delete obsolete absolute-hook-paths BDD test (#454)
- a214d187 refactor(hooks-command): remove import.meta.main from hook modules (#454)
- 152d3bf1 feat(portable-settings): update file-permission builder to emit CLI commands (#456)
- 9b98d541 feat(hooks-command): wire hooks into CLI entry point (#455)
- b9959842 fix(portable-settings): update hitl-prompt tests for CLI commands (#454)
- ea5ba5a9 feat(hooks-command): add hooks dispatch command module (#455)
- b2e10858 feat(portable-settings): update HITL builders to emit CLI commands (#456)
- 4d575feb test(hooks-command): add integration test (RED) (#454)
- ee98441a test(portable-settings): add integration test — RED (#454)
- b54d368a plan(cli-hook-commands): checkpoint (#454)
- 45e7323f design(cli-hook-commands): checkpoint (#454)
