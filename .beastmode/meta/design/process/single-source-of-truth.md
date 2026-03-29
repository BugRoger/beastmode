# Single Source of Truth

## Observation 1
### Context
During bulletproof-state-scanner design, 2026-03-29
### Observation
The design made three independent decisions that all enforced the same principle: (1) kill the fallback inline scanner to have one canonical implementation, (2) replace phase marker files with a top-level `manifest.phase` field so phase has one source, (3) remove the `manifest.phases` map that duplicated phase state in a different format. Each decision independently chose to eliminate a second source rather than reconcile it with the first. The explicit rationale was "a clean error is better than silently wrong data" — when two sources diverge, the failure mode of having one source (hard error) is better than the failure mode of two sources (silent disagreement).
### Rationale
Dual sources of truth create divergence that compounds silently. The design pattern is: when discovering dual sources, kill the secondary rather than adding reconciliation logic. Reconciliation adds complexity and still permits transient disagreement. A single source is simpler, fails loudly, and is easier to debug.
### Source
.beastmode/artifacts/design/2026-03-29-bulletproof-state-scanner.md
### Confidence
[MEDIUM] — first observation; pattern appeared three times within a single design but needs cross-session confirmation

## Observation 2
### Context
During manifest-file-management design, 2026-03-29
### Observation
The design made 4 independent single-source-of-truth decisions: (1) kill EpicState, FeatureProgress, ScanResult types in favor of one PipelineManifest, (2) consolidate all filesystem access into manifest-store.ts as the sole fs-touching module, (3) unify completion signals from two markers (.dispatch-done.json + output.json) to one (output.json only), (4) eliminate dual directory naming confusion by renaming state/ to artifacts/ and pipeline/ to state/ so names match semantics. Each decision independently eliminated a competing source rather than reconciling duplicates.
### Rationale
Confirms the Obs 1 pattern across a different subsystem. The manifest refactor is a different codebase area (manifest handling vs. state scanner) but applies the identical principle: when two sources exist, kill the secondary rather than adding reconciliation logic. Four independent applications within a single design strengthens the pattern.
### Source
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
### Confidence
[MEDIUM] -- second observation across different subsystems; same pattern (kill secondary source) applied 4 times within this design
