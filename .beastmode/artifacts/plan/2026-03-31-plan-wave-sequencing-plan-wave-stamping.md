---
phase: plan
epic: plan-wave-sequencing
feature: plan-wave-stamping
wave: 1
---

# Plan Wave Stamping

**Design:** `.beastmode/artifacts/design/2026-03-31-plan-wave-sequencing.md`

## User Stories

1. As a developer, I want the plan phase to group features into sequenced waves, so that dependent features don't start until their prerequisites land.
3. As a developer, I want to see wave groupings in the plan's executive summary before approval, so that I can adjust the sequence if the planner got it wrong.

## What to Build

Extend the plan skill's execute and validate phases to support wave-based feature sequencing.

**Execute phase (phase 1):** During feature decomposition, the planner identifies which features depend on others and proposes wave groupings. When decomposing the PRD into features, capture wave assignment alongside name, user stories, what-to-build, and acceptance criteria. Wave assignment follows the same logic used in implement's task waves: foundation modules in wave 1, consumers in wave 2, integration in wave 3, etc. The planner presents proposed waves as part of the normal interview flow for user confirmation.

**Validate phase (phase 2):** After the existing coverage check and completeness check, stamp `wave: N` into each feature's record based on the execute phase's proposed ordering. The executive summary table must be grouped by wave, with a rationale column explaining why features are in each wave. Single-feature plans automatically get `wave: 1`.

**Checkpoint phase (phase 3):** The feature plan file template's YAML frontmatter already includes `wave:`. Ensure checkpoint writes the stamped wave number from validate into each feature plan's frontmatter. The handoff listing should be ordered by wave (wave 1 features first, then wave 2, etc.).

## Acceptance Criteria

- [ ] Plan execute proposes wave groupings when decomposing features
- [ ] Plan validate stamps `wave: N` into each feature plan's YAML frontmatter
- [ ] Executive summary displays a wave-grouped table with rationale column
- [ ] Single-feature plans get `wave: 1` automatically
- [ ] Checkpoint writes correct wave numbers to feature plan file frontmatter
- [ ] Handoff listing is ordered by wave number
