---
name: plan
description: Create implementation plans — planning, architecting, task breakdown. Use after design. Creates step-by-step implementation plan with code examples.
---

# /plan

Write comprehensive implementation plans with bite-sized tasks. Assumes the engineer has zero codebase context.

<HARD-GATE>
No EnterPlanMode or ExitPlanMode — this skill manages its own flow. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load context, read design doc
1. [Execute](phases/1-execute.md) — Create tasks with steps
2. [Validate](phases/2-validate.md) — Completeness check, user approval
3. [Checkpoint](phases/3-checkpoint.md) — Save plan, suggest /implement

@_shared/task-runner.md
