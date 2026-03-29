## Context
Multiple competing type definitions existed: EpicState in state-scanner.ts, Manifest in state-scanner.ts, FeatureProgress, ScanResult. The blocked state was a boolean collapsing multiple fields.

## Decision
PipelineManifest is the sole manifest type, exported from manifest-store.ts. EpicState, FeatureProgress, ScanResult, and the old Manifest interface are all deleted. watch-types.ts is deleted — watch command imports from manifest-store.ts. Blocked is a structured field: `{ gate: string; reason: string } | null` (not boolean), enabling status display of block reason. costUsd removed from all types.

## Rationale
One type, one truth. PipelineManifest unifies all consumers. Structured blocked field provides actionable information in status output without requiring additional lookups. Deleting competing types eliminates silent divergence.

## Source
.beastmode/artifacts/design/2026-03-29-status-unfuckery-v2.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
