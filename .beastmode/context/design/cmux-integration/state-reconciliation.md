## Context
After an agent completes a phase, the watch loop needs to reconcile state (check results, update manifest, determine next phase). The reconciliation mechanism differs by dispatch strategy.

## Decision
State reconciliation is strategy-scoped. `SdkStrategy` reconciles state inline after query() completes — reads output.json, enriches manifest via manifest.ts. `CmuxStrategy` relies on `phaseCommand` (running inside the surface) to handle its own lifecycle — the watch loop detects completion via output.json and triggers a re-scan.

## Rationale
SDK has direct access to session results and can reconcile immediately. cmux surfaces run phaseCommand as an independent process, so reconciliation happens inside the surface. The watch loop's only job for cmux is detecting the marker and triggering a re-scan.

## Source
`.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md`
