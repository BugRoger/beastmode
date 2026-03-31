---
phase: plan
epic: retro-consolidation
feature: inline-release-retro
---

# Inline Release Retro

**Design:** .beastmode/artifacts/design/2026-03-31-retro-consolidation.md

## User Stories

2. As a pipeline operator, I want retro to run once at release with all phase artifacts, so that the knowledge hierarchy gets a coherent full-cycle update instead of five fragmented passes.

## What to Build

Rewrite the release checkpoint phase (phase 3) to:

1. **Remove conditional compaction** — delete the entire Step 0 block (cadence check, compaction agent spawn, timestamp update, report copy). Compaction is now manual-only via `beastmode compact`.

2. **Replace retro @import with inlined orchestration** — instead of `@../_shared/retro.md`, inline a simplified retro flow directly in the release checkpoint:
   - Spawn only the context walker agent (read from `agents/retro-context.md`)
   - Provide all phase artifacts in the session context block: design, plan, implement, validate, and release artifacts via a glob or enumerated list of `artifacts/{phase}/` directories for the current feature
   - Remove the quick-exit check — retro runs unconditionally at release
   - Remove the meta walker spawn entirely
   - After the context walker returns, apply all L3/L2/L1 changes automatically (no gates)
   - Only gate L0 changes via `[GATE|retro.beastmode]` with human/auto options
   - Remove the "Merge Walker Outputs" step since there's only one walker
   - Preserve the bottom-up application order: L3 records → L2 context docs → L1 phase summaries → L0 BEASTMODE.md

3. **Keep all post-retro steps unchanged** — the transition boundary, commit, squash merge, version compute, changelog, version bump, release artifacts, commit, tagging, plugin update, and completion steps remain exactly as they are.

The inlined retro should be self-contained within the release checkpoint — no shared file dependency.

## Acceptance Criteria

- [ ] Release checkpoint has no `@../_shared/retro.md` import
- [ ] Release checkpoint has no compaction steps (Step 0 removed)
- [ ] Release checkpoint spawns only the context walker agent
- [ ] Context walker receives all phase artifacts (design, plan, implement, validate, release)
- [ ] No quick-exit check exists
- [ ] L3/L2/L1 changes apply automatically without gates
- [ ] L0 changes use `[GATE|retro.beastmode]` with human/auto options
- [ ] Bottom-up application order preserved (L3 → L2 → L1 → L0)
- [ ] All post-retro steps (commit through completion) are unchanged
