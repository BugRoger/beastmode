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

0. [Research](phases/0-research.md) — (Optional) Discover unknowns via keywords/complexity
1. [Prepare](phases/1-prepare.md) — Read design, explore codebase
2. [Write](phases/2-write.md) — Create tasks with TDD steps
3. [Handoff](phases/3-handoff.md) — Ask user, provide /implement command
