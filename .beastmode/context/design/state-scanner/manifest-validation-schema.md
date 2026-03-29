## Context
Scanner and reconciler used ad-hoc field access on manifest objects with no shared definition of what constitutes a valid manifest. This caused silent divergence — the reconciler wrote fields the scanner ignored, and the scanner expected fields the reconciler didn't write.

## Decision
Shared manifest validation schema (Zod-style or plain TypeScript validator) used by both scanner (read) and reconciler (write). Required fields: phase (valid Phase literal), design (string), features (array of objects with slug: string and status: string), lastUpdated (string). Feature status values validated against known set: pending, in-progress, completed, blocked. Strict rejection — manifests failing validation are skipped entirely.

## Rationale
Shared schema ensures writer and reader agree on structure. Strict rejection prevents corrupt data from polluting status output. Validating feature status values catches typos and drift at parse time instead of downstream.

## Source
.beastmode/state/design/2026-03-29-status-unfuckery-v2.md
