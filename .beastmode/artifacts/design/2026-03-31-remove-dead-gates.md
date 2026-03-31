---
phase: design
slug: remove-dead-gates
---

## Problem Statement

Three gates in the workflow add friction without value. The two plan gates (`feature-set-approval`, `feature-approval`) are already set to `auto` — they're dead infrastructure that still pollutes the skill files. The `slug-proposal` gate interrupts flow for a trivial naming confirmation that Claude can handle autonomously.

## Solution

Fully remove all three gates from skill markdown files and config.yaml. Collapse each to its single non-gated behavior path. Renumber steps after deletion.

## User Stories

1. As a user, I want the plan phase to proceed without approval gates, so that autonomous pipeline execution has no dead gate infrastructure
2. As a user, I want design checkpoint to auto-derive slugs without prompting, so that the naming step doesn't interrupt flow
3. As a developer, I want removed gates cleaned from config.yaml, so that the config reflects reality

## Implementation Decisions

- Full removal: delete GATE structures from skill markdown, remove config entries, collapse to single behavior path
- Plan execute: delete steps 4 (feature-set-approval with summary table) and 5 (feature-approval) entirely, renumber step 6 to step 4
- Plan validate: delete step 5 (feature-set-approval final gate) entirely
- Design checkpoint: collapse slug-proposal gate to auto-derive behavior (Claude synthesizes slug from problem statement, uses it directly, no prompt)
- Config.yaml: remove `plan.feature-set-approval`, `plan.feature-approval`, and `design.slug-proposal` entries
- DESIGN.md context doc: no changes needed — gate principles still apply to remaining gates

## Testing Decisions

- Verify config.yaml parses as valid YAML after edits
- Verify plan skill files have sequential step numbers after renumbering
- Verify no references to removed gate IDs remain in skill files (grep for the gate names)
- Verify design checkpoint still has slug derivation logic (just without the gate wrapper)

## Out of Scope

- Removing or changing any other gates
- Updating DESIGN.md or other context docs
- Changing gate behavior for remaining gates

## Further Notes

None

## Deferred Ideas

None
