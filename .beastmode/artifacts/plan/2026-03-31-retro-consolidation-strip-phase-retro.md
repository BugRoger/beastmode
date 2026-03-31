---
phase: plan
epic: retro-consolidation
feature: strip-phase-retro
---

# Strip Phase Retro

**Design:** .beastmode/artifacts/design/2026-03-31-retro-consolidation.md

## User Stories

1. As a skill author, I want checkpoint phases to only commit and hand off, so that skills are simpler and faster.

## What to Build

Remove the `@../_shared/retro.md` import from the checkpoint phase (phase 3) of four skills: design, plan, implement, and validate. Each checkpoint currently has a "Phase Retro" step that imports the shared retro orchestrator. After removal, these checkpoints should contain only their commit and handoff logic — no retro invocation whatsoever.

The design checkpoint has an additional SKIP instruction note for the Quick-Exit Check that should also be removed, since the quick-exit concept no longer applies.

The release checkpoint is NOT touched by this feature — it gets its own rewrite in `inline-release-retro`.

## Acceptance Criteria

- [ ] Design checkpoint phase has no retro @import or retro-related steps
- [ ] Plan checkpoint phase has no retro @import or retro-related steps
- [ ] Implement checkpoint phase has no retro @import or retro-related steps
- [ ] Validate checkpoint phase has no retro @import or retro-related steps
- [ ] Release checkpoint phase is unchanged by this feature
- [ ] All four modified checkpoints still contain their commit and handoff steps
