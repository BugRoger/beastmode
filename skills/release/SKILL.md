---
name: release
description: Create changelogs and release notes — releasing, documenting, shipping. Use after validate. Detects version, categorizes commits, generates changelog, commits, merges or creates PR.
---

# /release

Detect version, categorize commits, generate changelog, commit, merge or PR, tag.

<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load artifacts, determine version
1. [Execute](phases/1-execute.md) — Categorize, changelog, commit, merge/PR, tag
2. [Validate](phases/2-validate.md) — Verify release completeness
3. [Checkpoint](phases/3-checkpoint.md) — Retro, status update
