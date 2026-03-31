---
phase: design
slug: retro-consolidation
---

## Problem Statement

Skills are overloaded — every checkpoint phase bundles retro (two parallel agents), commit, and handoff into a single sub-phase. Retro can't parallelize with anything because it's trapped inside the skill session. The meta walker runs after every phase but produces minimal value, and per-phase retro context doesn't spill across phases anyway — retro learnings improve future sessions, not the current pipeline.

## Solution

Consolidate retro into the release skill only. Remove retro from design, plan, implement, and validate checkpoints. Kill the meta walker entirely. Inline the shared retro orchestration (`_shared/retro.md`) directly into the release skill, spawning only the context walker agent with all phase artifacts in a single pass. Collapse the four-level gate structure to a single `retro.beastmode: human` gate. Remove automatic compaction from release (manual-only via `beastmode compact`). Merge universally applicable meta rules into BEASTMODE.md, then delete the meta/ tree.

## User Stories

1. As a skill author, I want checkpoint phases to only commit and hand off, so that skills are simpler and faster.
2. As a pipeline operator, I want retro to run once at release with all phase artifacts, so that the knowledge hierarchy gets a coherent full-cycle update instead of five fragmented passes.
3. As a project maintainer, I want the meta/ tree removed and universal rules merged to BEASTMODE.md, so that there's one knowledge hierarchy (context/) instead of two.
4. As a config author, I want a single `retro.beastmode` gate instead of four retro gates, so that config reflects actual gating behavior (the other three were always auto).
5. As a future session, I want the knowledge hierarchy rules in DESIGN.md updated to reflect the new retro behavior, so that I don't follow stale instructions.

## Implementation Decisions

- Retro runs once in the release skill, before the squash-merge to main, after changelog generation
- Release skill inlines the retro orchestration — no `@../_shared/retro.md` import
- Release skill spawns the context walker agent (`agents/retro-context.md`) as the sole walker
- Context walker receives all phase artifacts (design, plan, implement, validate, release) in one session context block — processes them in a single pass
- Context walker agent (`retro-context.md`) requires no changes — already self-contained with no meta walker references
- Meta walker agent (`agents/retro-meta.md`) is deleted
- Shared retro orchestrator (`skills/_shared/retro.md`) is deleted
- Retro `@import` removed from design, plan, implement, and validate checkpoint phases
- The quick-exit check is removed — retro runs unconditionally at release (single invocation, always worth running)
- Config gates `retro.records`, `retro.context`, and `retro.phase` are removed from config.yaml
- Only `retro.beastmode: human` gate survives — L0 updates still require human approval
- All L3/L2/L1 changes apply automatically (no gate), bottom-up hierarchy order preserved
- Compaction removed from release — manual-only via `beastmode compact`
- `.beastmode/state/.last-compaction` tracking file is no longer consulted during release
- Meta/ tree: review all files, merge universally applicable rules (those that apply to any project using beastmode, not just this project) into BEASTMODE.md, then delete the entire `meta/` directory
- Knowledge hierarchy rules in `context/DESIGN.md` and `context/RELEASE.md` updated as part of implementation to reflect the new retro behavior

## Testing Decisions

- Verify all five checkpoint phases (design, plan, implement, validate, release) — only release should reference retro
- Verify `_shared/retro.md` and `agents/retro-meta.md` are deleted
- Verify context walker agent is unchanged (diff should be empty)
- Verify config.yaml has only `retro.beastmode` gate under retro section
- Verify meta/ tree is fully removed
- Verify BEASTMODE.md contains any migrated meta rules
- Verify DESIGN.md rules are updated (no references to meta walker, per-phase retro, or compaction-before-retro)
- Run a release cycle end-to-end to confirm retro still produces L1/L2/L3 context updates

## Out of Scope

- State machine changes (retro stays in skill, not modeled as machine state)
- Context walker algorithm changes (agent stays as-is)
- Compaction algorithm changes (manual command preserved, just decoupled from release)
- L3 value-add gate changes (still applies within context walker)

## Further Notes

- The context walker's session context block needs a new field for multiple artifacts (currently takes a single artifact path). The implementation should pass an array or glob pattern for all `artifacts/{phase}/` directories.
- Init system retro pass (phase 4 of init) is a separate concern — it uses its own writers/retros for bootstrapping, not the phase retro system. No changes needed there.

## Deferred Ideas

- Retro as a state machine state with interleaved or parallel topology (discussed and deferred — current approach is simpler)
- Cross-phase knowledge spill (retro findings informing subsequent phases in the same pipeline run)
- Confidence decay over time for L3 records
- State domain walker for deferred ideas reconciliation
