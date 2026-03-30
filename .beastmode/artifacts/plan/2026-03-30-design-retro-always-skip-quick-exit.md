---
phase: plan
epic: design-retro-always
feature: skip-quick-exit
---

# Skip Quick-Exit Check for Design Retro

**Design:** .beastmode/artifacts/design/2026-03-30-design-retro-always.md

## User Stories

1. As a beastmode user, I want design retro to always run, so that decisions from the PRD interview are captured in the knowledge hierarchy.
2. As a future Claude session, I want design context to be updated after every PRD, so that I have accurate L2/L3 records for the next design session.
3. As a beastmode maintainer, I want the override to reference retro sections by name (not step number), so that it survives future renumbering of retro.md.

## What to Build

Add a blockquote directive in the design checkpoint file (`skills/design/phases/3-checkpoint.md`) immediately before the existing `@../_shared/retro.md` import. The directive instructs the retro to skip its "Quick-Exit Check" section by name. This follows the same blockquote directive pattern already used in the release checkpoint for transition boundaries. The shared `retro.md` file remains unchanged — the override is purely a consumer-side instruction.

## Acceptance Criteria

- [ ] Design checkpoint contains a blockquote directive before the retro import that instructs skipping the "Quick-Exit Check" section by name
- [ ] The directive references "Quick-Exit Check" by section name, not by step number
- [ ] Shared `retro.md` is unmodified
- [ ] Other phase checkpoints (plan, implement, validate, release) are unmodified
- [ ] Running a design cycle results in retro executing fully without quick-exit evaluation
