# Architecture-First Decomposition for Shared-Module Epics

## Observation 1
### Context
During manifest-file-management planning, 2026-03-29
### Observation
A 12-user-story PRD where all features touch overlapping modules (manifest.ts, state paths, output.json, skill checkpoints) was decomposed by first identifying 8 cross-cutting architectural decisions, then slicing vertically by responsibility boundary rather than by module. The resulting 5 features (manifest-modules, directory-rename, consumer-migration, skill-checkpoint, stop-hook) each own a distinct concern even though they modify some of the same files. This avoided creating features with conflicting changes to shared modules.
### Rationale
Infrastructure replacement epics differ from green-field feature epics: features share module targets instead of being functionally independent. The decomposition heuristic of "architecture decisions first, then slice by responsibility boundary" is different from the default "slice by functional domain" approach. Getting this wrong would create features that produce merge conflicts or require complex ordering constraints.
### Source
.beastmode/artifacts/plan/2026-03-29-manifest-file-management.manifest.json
### Confidence
[LOW] -- first observation of this specific decomposition variant
