---
name: implement
description: "Execute implementation plans by dispatching subagents per task — writes code files, creates modules, runs spec checks, and handles deviations with wave-ordered execution. Use when the user wants to execute a plan, start building, implement features, carry out tasks, or code the designed solution."
---

# /implement

Load the plan, dispatch subagents per task in wave order, verify completion against specs.

<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No EnterPlanMode or ExitPlanMode. [→ Why](references/constraints.md)

Example TodoWrite structure:
- [ ] Phase 0: Prime — load plan, parse waves
- [ ] Phase 1: Execute — dispatch agents, spec check, wave checkpoints
- [ ] Phase 2: Validate — run tests, deviation summary, fix loop
- [ ] Phase 3: Checkpoint — save deviations, suggest /validate
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load plan, parse waves
1. [Execute](phases/1-execute.md) — Dispatch agents, spec check, wave checkpoints
2. [Validate](phases/2-validate.md) — Run tests, deviation summary. If failures → fix and re-run before proceeding
3. [Checkpoint](phases/3-checkpoint.md) — Save deviations, suggest /validate
