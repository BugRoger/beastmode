---
phase: release
slug: hitl-config
epic: hitl-config
bump: minor
---

# Release: hitl-config

**Version:** v0.63.0
**Date:** 2026-04-03

## Highlights

Adds configurable human-in-the-loop control to all pipeline phases. Per-phase prose config in `config.yaml` is interpreted as a prompt hook on `AskUserQuestion`, enabling gradual delegation from manual to automated decisions. All decisions are logged, and retro surfaces repetitive patterns as automation candidates.

## Features

- Per-phase HITL prose config in `config.yaml` with "always defer to human" defaults (`implement(config-schema)`)
- `PreToolUse` prompt hook on `AskUserQuestion` — reads HITL instructions, auto-answers or defers to human (`implement(hitl-config-hook-generation)`)
- `PostToolUse` command hook logs all auto and human decisions to `hitl-log.md` (`implement(hitl-config-decision-logging)`)
- Skill contract enforcement: L0 constraint + guiding principle requiring all user input via `AskUserQuestion` (`implement(skill-contract)`)
- Retro context walker analyzes HITL logs, identifies repetitive human decisions, generates `config.yaml` snippets for automation (`implement(hitl-config-retro-integration)`)

## Full Changelog

- `0ec23ce` design(hitl-config): checkpoint
- `efe5a7b` design(hitl-config): checkpoint
- `1f29f6f` plan(hitl-config): checkpoint
- `a2d85d6` implement(skill-contract): checkpoint
- `08d3018` implement(config-schema): checkpoint
- `d553a19` implement(hitl-config-decision-logging): checkpoint
- `b822094` implement(hitl-config-hook-generation): checkpoint
- `22eb01c` implement(hitl-config-retro-integration): checkpoint
- `3e0b84f` validate(hitl-config): checkpoint
