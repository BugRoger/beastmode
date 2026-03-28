# Cross-Phase Edit Scope

## Observation 1
### Context
During github-phase-integration implementation, 2026-03-28. A single implement run touched checkpoint files across all 5 phases (design, plan, implement, validate, release) plus shared utilities and config.
### Observation
Cross-cutting features that add a consistent step to every phase's checkpoint require edits across the entire skill directory tree. This is unusual — most features are scoped to a single phase. The plan decomposed these into separate features per phase, which maintained file isolation within waves even though the overall scope spanned all phases. The key enabler was treating each phase's checkpoint as an independent feature with its own plan.
### Rationale
Cross-phase features need explicit decomposition strategy in the plan phase. Without per-phase feature boundaries, a single feature touching 10+ files across 5 directories would be difficult to parallelize and verify. The per-phase decomposition preserved the file-isolation invariant.
### Source
.beastmode/state/plan/2026-03-28-github-phase-integration.manifest.json
### Confidence
[LOW] — first observation
