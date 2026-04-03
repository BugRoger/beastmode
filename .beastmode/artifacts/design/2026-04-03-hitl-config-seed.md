---
phase: design
slug: hitl-config-seed
epic: hitl-config-seed
---

## Problem Statement

This project's `.beastmode/config.yaml` predates the HITL feature. The CLI falls back to hardcoded defaults in `config.ts`, so the hook works — but the user has no visible `hitl:` section to inspect or tune. The init template already ships the block, but existing projects don't get it retroactively.

## Solution

Add the `hitl:` section to `.beastmode/config.yaml` with design set to fully human and all other phases set to fully auto.

## User Stories

1. As a user, I want visible `hitl:` config in my project's `config.yaml` so that I can see and change per-phase HITL behavior without reading CLI source code.
2. As a user, I want design to stay fully human so that the collaborative interview process is never bypassed.
3. As a user, I want plan, implement, validate, and release to be fully auto so that the pipeline runs without blocking on questions.

## Implementation Decisions

- Add `hitl:` block to `.beastmode/config.yaml` directly — no CLI migration, no init rerun
- design: `"always defer to human"`
- plan, implement, validate, release: `"auto-answer all questions, never defer to human"`
- Include `model: haiku` and `timeout: 30` matching the init template defaults
- Preserve existing `cli:` and `github:` sections unchanged
- Single file edit, no other files affected

## Testing Decisions

- Verify `config.yaml` parses correctly after edit (valid YAML)
- Verify CLI reads the new `hitl:` section instead of falling back to hardcoded defaults
- Prior art: existing config loading in `cli/src/config.ts` with null-coalescing fallback

## Out of Scope

- CLI migration for auto-detecting and backfilling missing `hitl:` sections
- Changes to the CLI's hardcoded defaults
- Changes to the init template
- HITL prose tuning beyond human/auto

## Further Notes

None

## Deferred Ideas

- CLI migration that detects missing config sections and offers to seed them
