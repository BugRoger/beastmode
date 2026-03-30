---
phase: design
slug: design-retro-always
---

## Problem Statement

The design phase retro gets skipped by the Quick-Exit Check in `retro.md`, which uses subjective criteria ("fewer than ~5 substantive tool calls", "routine re-run"). Design PRDs always contain interesting decisions, patterns, and architectural choices worth capturing — the retro should always run after a design session.

## Solution

Add a checkpoint-level override directive in `skills/design/phases/3-checkpoint.md` that instructs the retro to skip the Quick-Exit Check section. This is a single-line addition before the existing `@../_shared/retro.md` import. Other phases retain quick-exit behavior.

## User Stories

1. As a beastmode user, I want design retro to always run, so that decisions from the PRD interview are captured in the knowledge hierarchy.
2. As a future Claude session, I want design context to be updated after every PRD, so that I have accurate L2/L3 records for the next design session.
3. As a beastmode maintainer, I want the override to reference retro sections by name (not step number), so that it survives future renumbering of retro.md.

## Implementation Decisions

- Override lives in `skills/design/phases/3-checkpoint.md`, not in shared `retro.md` or config.yaml
- Uses a blockquote directive before the `@../_shared/retro.md` import line
- References the "Quick-Exit Check" section by name, not by step number, to survive renumbering
- Scope is design-only — plan, implement, validate, and release retain the quick-exit check
- No changes to `retro.md` itself — the shared file remains unchanged
- No changes to L2 context docs — the existing DESIGN.md rule ("NEVER skip retro") is already correct
- No changes to config.yaml — no new gate mechanism needed

## Testing Decisions

- Prompt engineering change — no executable code to test
- Verification: run a design cycle and confirm retro executes instead of quick-exiting
- Prior art: the release checkpoint already has a similar transition boundary directive using blockquote syntax

## Out of Scope

- Removing quick-exit from all phases (user explicitly chose design-only)
- Adding a config.yaml gate for quick-exit control
- Modifying the shared retro.md file

## Further Notes

The L2 context (DESIGN.md) already states "NEVER skip retro — walkers handle empty phases gracefully, no quick-exit gating" as a global rule. This change makes design actually enforce that rule. The inconsistency between the global L2 rule and per-phase behavior in other phases is acceptable for now.

## Deferred Ideas

None
