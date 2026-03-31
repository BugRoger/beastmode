---
name: release
description: Create changelogs and release notes — releasing, documenting, shipping. Use after validate. Detects version, categorizes commits, generates changelog, commits, merges or creates PR.
---

# /release

Detect version, categorize commits, generate changelog, commit, merge or PR, tag.

<HARD-GATE>
Execute @../task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load artifacts, determine version
1. [Execute](phases/1-execute.md) — Categorize, changelog, commit, merge/PR, tag
2. [Validate](phases/2-validate.md) — Verify release completeness
3. [Checkpoint](phases/3-checkpoint.md) — Retro, status update
