---
name: validate
description: Quality gate — testing, linting, validating. Use after implement. Runs tests and checks quality gates.
---

# /validate

Verify code changes meet quality standards before release.

<HARD-GATE>
Execute @../task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No release without passing validation. [→ Why](references/quality-gates.md)
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load context, identify checks
1. [Execute](phases/1-execute.md) — Run tests and quality checks
2. [Validate](phases/2-validate.md) — Analyze results against gates
3. [Checkpoint](phases/3-checkpoint.md) — Save report, suggest /release or fix
