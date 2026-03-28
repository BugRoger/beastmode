# Manifest-Based Feature Decomposition

## Observation 1
### Context
During github-phase-integration planning, 2026-03-28
### Observation
The plan phase now produces a manifest JSON plus N independent feature plans rather than a single monolithic plan. The manifest tracks feature slugs, plan paths, statuses, and architectural decisions. Each feature plan is a self-contained document with user stories, what-to-build, and acceptance criteria scoped to that feature alone. The github-phase-integration PRD decomposed into 7 features this way.
### Rationale
This structural shift changes the plan phase's output contract. Instead of one large plan file, consumers (implement, validate) now read the manifest to discover features and their individual plans. This is worth tracking because it affects how downstream phases operate.
### Source
state/plan/2026-03-28-github-phase-integration.manifest.json
### Confidence
[LOW] -- first observation of production use (feature was introduced this release cycle)
