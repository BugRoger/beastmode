---
name: design
description: "Create product requirements documents through structured decision-tree interviews — explores design branches, identifies gray areas, and produces a complete PRD. Use when the user wants to spec out a feature, write a product requirements document, scope a new initiative, or gather requirements before planning."
---

# /design

Create PRDs through structured decision-tree interviews and collaborative dialogue. Walks every branch of the design space, surfaces gray areas, and produces a PRD ready for `/plan`.

<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No implementation until PRD is approved. [→ Why](references/constraints.md)

Example TodoWrite structure:
- [ ] Phase 0: Prime — load context and prior decisions
- [ ] Phase 1: Execute — decision-tree interview, gray-area sweep
- [ ] Phase 2: Validate — PRD completeness check, user approval
- [ ] Phase 3: Checkpoint — save PRD, update status
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load context, check prior decisions
1. [Execute](phases/1-execute.md) — Decision tree walk, gray areas
2. [Validate](phases/2-validate.md) — PRD completeness check, user approval. If incomplete → return to Phase 1 to address gaps
3. [Checkpoint](phases/3-checkpoint.md) — Save PRD, update status, suggest /plan
