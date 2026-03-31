---
phase: plan
epic: retro-consolidation
feature: meta-tree-migration
---

# Meta Tree Migration

**Design:** .beastmode/artifacts/design/2026-03-31-retro-consolidation.md

## User Stories

3. As a project maintainer, I want the meta/ tree removed and universal rules merged to BEASTMODE.md, so that there's one knowledge hierarchy (context/) instead of two.

## What to Build

Review the entire `.beastmode/meta/` tree (L1 phase summaries, L2 domain files, L3 records) and classify each rule as either:

- **Universal** — applies to any project using beastmode, not just this project. These get merged into BEASTMODE.md.
- **Project-specific** — already captured in context/ or no longer relevant. These are discarded.

The meta tree contains process patterns and workaround records across design, plan, implement, validate, and release phases. The L1 files (DESIGN.md, PLAN.md, IMPLEMENT.md, VALIDATE.md, RELEASE.md) contain promoted procedures; the L2 files contain detailed domain knowledge; the L3 records contain individual observations.

After classification:
1. Merge universal rules into appropriate sections of `.beastmode/BEASTMODE.md`
2. Delete the entire `.beastmode/meta/` directory tree
3. Remove all references to the meta/ tree from L1 context files (context/PLAN.md, etc. reference meta/ paths)
4. Remove meta walker references from the retro orchestration (already handled by inline-release-retro, but verify no stale references remain)

The L1 context files currently reference meta domains in their summaries. These references need to be removed or rewritten to reflect the single-hierarchy (context-only) model.

## Acceptance Criteria

- [ ] All meta/ files reviewed and classified as universal or project-specific
- [ ] Universal rules merged into BEASTMODE.md
- [ ] Entire `.beastmode/meta/` directory deleted
- [ ] No L1 context files reference meta/ paths
- [ ] No L2 context files reference meta/ paths
- [ ] BEASTMODE.md contains the merged universal rules in appropriate sections
