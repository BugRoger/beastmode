---
name: implement
description: Execute implementation plans — implementing, coding, building. Use after plan. Runs tasks in isolated worktree, merges on completion.
---

# /implement

Load plan, execute tasks in cycle worktree, verify completion.

<HARD-GATE>
No EnterPlanMode or ExitPlanMode — worktree isolation only. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load plan, enter worktree
1. [Execute](phases/1-execute.md) — Run tasks, write code
2. [Validate](phases/2-validate.md) — Run tests, check build
3. [Checkpoint](phases/3-checkpoint.md) — Update status, suggest /validate

@_shared/task-runner.md
