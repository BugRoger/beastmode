---
name: design
description: Create PRDs through structured decision-tree interviews — designing, speccing, scoping. Walks every branch of the design tree, sweeps for gray areas, writes a PRD.
---

# /design

Create PRDs through structured decision-tree interviews and collaborative dialogue.

<HARD-GATE>
Execute @../task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No implementation until PRD is approved. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load context, check prior decisions
1. [Execute](phases/1-execute.md) — Decision tree walk, gray areas
2. [Validate](phases/2-validate.md) — PRD completeness check, user approval
3. [Checkpoint](phases/3-checkpoint.md) — Save PRD, update status, suggest /plan
