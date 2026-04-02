---
name: plan
description: "Decompose PRDs into independent feature plans — identifies scope boundaries, determines implementation order, and documents architectural decisions for each vertical slice. Use when the user wants to break down requirements, create a task breakdown, plan feature implementation, or split a PRD into buildable pieces."
---

# /plan

Decompose a PRD into independent feature plans. Each feature is a vertical slice that can be implemented separately via `/implement`.

<HARD-GATE>
Execute @../task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No EnterPlanMode or ExitPlanMode — this skill manages its own flow. [→ Why](references/constraints.md)

Example TodoWrite structure:
- [ ] Phase 0: Prime — load context, read design doc
- [ ] Phase 1: Execute — identify architectural decisions, decompose into features
- [ ] Phase 2: Validate — coverage check, feature set approval
- [ ] Phase 3: Checkpoint — save feature plans
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load context, read design doc
1. [Execute](phases/1-execute.md) — Identify architectural decisions, decompose into features
2. [Validate](phases/2-validate.md) — Coverage check: verify every PRD requirement maps to at least one feature. If gaps → return to Phase 1
3. [Checkpoint](phases/3-checkpoint.md) — Save feature plans, suggest /implement
