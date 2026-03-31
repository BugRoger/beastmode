---
phase: plan
epic: retro-consolidation
feature: update-knowledge-rules
---

# Update Knowledge Rules

**Design:** .beastmode/artifacts/design/2026-03-31-retro-consolidation.md

## User Stories

5. As a future session, I want the knowledge hierarchy rules in DESIGN.md updated to reflect the new retro behavior, so that I don't follow stale instructions.

## What to Build

Update the knowledge hierarchy rules in `.beastmode/context/DESIGN.md` and `.beastmode/context/RELEASE.md` to reflect the consolidated retro model:

**DESIGN.md changes:**
- Remove references to the meta walker (it no longer exists)
- Remove references to per-phase retro (retro only runs at release)
- Remove references to compaction-before-retro ordering (compaction is decoupled)
- Update any rules about "retro walkers" (plural) to "context walker" (singular)
- Remove meta/ tree structural invariant rules (no more matching L3 directories for meta/)
- Ensure the context/ structural invariant (L2 files must have matching L3 directories) is preserved
- Update the retro reconciliation description to reflect single-pass release-only behavior

**RELEASE.md changes:**
- Remove compaction-before-retro ordering rules
- Update retro description to reflect inlined, context-walker-only model
- Update any references to "shared retro orchestrator" since it no longer exists
- Ensure "NEVER skip retro before the release commit" rule is preserved

Both files serve as authoritative instructions for future sessions. Stale rules about meta walkers or per-phase retro would cause confusion and incorrect behavior.

## Acceptance Criteria

- [ ] DESIGN.md has no references to meta walker
- [ ] DESIGN.md has no references to per-phase retro
- [ ] DESIGN.md has no references to compaction-before-retro
- [ ] DESIGN.md retro rules describe single context walker at release only
- [ ] RELEASE.md has no compaction-before-retro references
- [ ] RELEASE.md retro description matches inlined context-walker model
- [ ] "NEVER skip retro before release commit" rule is preserved
- [ ] No references to `_shared/retro.md` in either file
