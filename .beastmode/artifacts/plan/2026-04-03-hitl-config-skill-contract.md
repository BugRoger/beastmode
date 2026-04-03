---
phase: plan
slug: hitl-config
epic: hitl-config
feature: skill-contract
wave: 1
---

# Skill Contract

**Design:** `.beastmode/artifacts/design/2026-04-03-hitl-config.md`

## User Stories

7. As a skill author, I want a clear contract that all user input must go through `AskUserQuestion` so that HITL hooks can intercept it.

## What to Build

Enforce the `AskUserQuestion`-only contract through three documentation layers:

- **BEASTMODE.md constraint**: Add an explicit directive to the prime directives or conventions section of BEASTMODE.md stating that all user input during phase sessions MUST go through `AskUserQuestion`. Freeform print-and-wait patterns are not interceptable by HITL hooks.

- **Skill guiding principle**: Add a guiding principle to each skill's SKILL.md (design, plan, implement, validate, release) reminding skill authors that user input must use `AskUserQuestion` for HITL interception.

- **L2 context documentation**: Add the contract to the relevant L2 context file (workflow or conventions) so retro and future design sessions are aware of the constraint.

This is documentation-only enforcement. Runtime enforcement is explicitly out of scope per the PRD.

## Acceptance Criteria

- [ ] BEASTMODE.md contains AskUserQuestion-only directive
- [ ] Each phase skill SKILL.md references the AskUserQuestion contract
- [ ] L2 context documents the constraint for future reference
- [ ] No runtime enforcement code (documentation only, per PRD)
