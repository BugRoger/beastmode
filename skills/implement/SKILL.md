---
name: implement
description: Execute implementation plans — implementing, coding, building. Use after plan. Runs tasks in isolated worktree, merges on completion.
---

# /implement

Create isolated worktree, load plan, execute tasks, merge back, cleanup.

<HARD-GATE>
No EnterPlanMode or ExitPlanMode — worktree isolation only. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

1. [Setup](phases/1-setup.md) — Create worktree, verify tests
2. [Prepare](phases/2-prepare.md) — Load plan, create task list
3. [Execute](phases/3-execute.md) — Run tasks, verify steps
4. [Complete](phases/4-complete.md) — Merge, cleanup, handoff
