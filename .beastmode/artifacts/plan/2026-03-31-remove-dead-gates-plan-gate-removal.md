---
phase: plan
epic: remove-dead-gates
feature: plan-gate-removal
---

# Plan Gate Removal

**Design:** `.beastmode/artifacts/design/2026-03-31-remove-dead-gates.md`

## User Stories

1. As a user, I want the plan phase to proceed without approval gates, so that autonomous pipeline execution has no dead gate infrastructure

## What to Build

Remove the two plan approval gates from the plan skill phase files:

- In the plan execute phase, delete the `[GATE|plan.feature-set-approval]` step (step 4) and the `[GATE|plan.feature-approval]` step (step 5) entirely. Both are set to `auto` and serve no purpose. Renumber the remaining step 6 ("Iterate Until Ready") to step 4.
- In the plan validate phase, delete the final `[GATE|plan.feature-set-approval]` step (step 5) entirely. The validate phase ends after the executive summary — no approval gate needed.

No replacement logic. The auto-approve log lines are dead output that nobody reads.

## Acceptance Criteria

- [ ] No `[GATE|plan.feature-set-approval]` syntax in any plan skill file
- [ ] No `[GATE|plan.feature-approval]` syntax in any plan skill file
- [ ] Steps in plan execute are numbered 1-4 sequentially
- [ ] Steps in plan validate are numbered 1-4 sequentially
- [ ] No `GATE-OPTION` subsections remain in plan skill files
