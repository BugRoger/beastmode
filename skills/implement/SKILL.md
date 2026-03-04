---
name: implement
description: Execute implementation plans — implementing, coding, building. Use after plan. Dispatches subagent per task with wave ordering, deviation handling, and spec checks.
---

# /implement

Load plan, dispatch subagents per task in wave order, verify completion.

<HARD-GATE>
No EnterPlanMode or ExitPlanMode — worktree isolation only. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load plan, parse waves, enter worktree
1. [Execute](phases/1-execute.md) — Dispatch agents, spec check, wave checkpoints
2. [Validate](phases/2-validate.md) — Run tests, deviation summary, fix loop
3. [Checkpoint](phases/3-checkpoint.md) — Save deviations, suggest /validate

@_shared/task-runner.md
