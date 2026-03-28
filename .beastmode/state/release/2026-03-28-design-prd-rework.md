# Release: design-prd-rework

**Version:** v0.19.0
**Date:** 2026-03-28

## Highlights

Reshapes the /design phase to produce PRDs through a structured two-pass decision-tree interview, replacing the freeform design doc flow.

## Features

- Two-pass interview flow: decision tree walk (one question at a time with recommendations) followed by gray area sweep for big-picture blind spots
- Inline codebase exploration during interviews — don't ask what you can read
- Inline research during decision tree walk — no separate research trigger
- Module sketch step with deep module identification between interview and PRD writing
- Prior decisions gate (`design.prior-decisions`, default: auto) — applies context/meta decisions without re-asking
- PRD output using standardized template: Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope, Further Notes, Deferred Ideas
- Validate phase checks PRD section completeness with anti-pattern threshold (fewer than 3 user stories)
- New gate set: `decision-tree` (human), `gray-areas` (human), `prior-decisions` (auto), `prd-approval` (human)

## Full Changelog

- Rewritten: `skills/design/SKILL.md` — updated description and phase labels
- Rewritten: `skills/design/phases/0-prime.md` — simplified prime with prior decisions gate, removed research trigger
- Rewritten: `skills/design/phases/1-execute.md` — two-pass interview with module sketch
- Rewritten: `skills/design/phases/2-validate.md` — PRD section completeness check
- Rewritten: `skills/design/phases/3-checkpoint.md` — PRD template output
- Updated: `.beastmode/config.yaml` — replaced 4 old design gates with 4 new ones
- Rewritten: `skills/design/references/constraints.md` — PRD references
