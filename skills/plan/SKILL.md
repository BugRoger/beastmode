---
name: plan
description: Decompose PRDs into independent features — scoping, slicing, architectural decisions. Use after design. Creates feature plans from a PRD.
---

# /plan

Decompose a PRD into independent feature plans. Each feature is a vertical slice that can be implemented separately via /implement.

<HARD-GATE>
Execute @../task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No EnterPlanMode or ExitPlanMode — this skill manages its own flow. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load context, read design doc
1. [Execute](phases/1-execute.md) — Identify architectural decisions, decompose into features
2. [Validate](phases/2-validate.md) — Coverage check, feature set approval
3. [Checkpoint](phases/3-checkpoint.md) — Save feature plans, suggest /implement
