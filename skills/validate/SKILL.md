---
name: validate
description: "Run quality gates before release — executes unit and integration tests, runs linters, checks type correctness, and verifies code formatting. Use when the user wants to run tests, check code quality, validate changes, lint the codebase, or verify implementation correctness after coding."
---

# /validate

Verify code changes meet quality standards before release. Runs tests, linters, type checks, and formatting validators against configured quality gates.

<HARD-GATE>
Execute @../task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No release without passing validation. [→ Why](references/quality-gates.md)

Example TodoWrite structure:
- [ ] Phase 0: Prime — load context, identify required checks
- [ ] Phase 1: Execute — run tests and quality checks
- [ ] Phase 2: Validate — analyze results against gates
- [ ] Phase 3: Checkpoint — save report, suggest next step
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load context, identify checks
1. [Execute](phases/1-execute.md) — Run tests and quality checks
2. [Validate](phases/2-validate.md) — Analyze results against gates. If failures → fix and re-run before proceeding
3. [Checkpoint](phases/3-checkpoint.md) — Save report, suggest /release or fix
