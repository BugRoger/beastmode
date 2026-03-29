## Context
The CLI had two divergent scanner implementations (state-scanner.ts and scanEpicsInline in watch-command.ts) with 19 concrete divergences causing inconsistent epic state reporting.

## Decision
Rewrite state-scanner.ts as the single canonical scanner. Kill the inline scanner entirely. Scanner is read-only — never writes to the filesystem. Discover epics by reading manifest files from the pipeline directory only, with no design file dependency. Uses flat-file manifest path convention: pipeline/YYYY-MM-DD-<slug>.manifest.json (no directory-per-slug).

## Rationale
Two scanners disagreeing about state is worse than one scanner with a bug. Read-only separation ensures the scanner can run on any tick without side effects. Manifests-only anchoring removes the design file dependency — pre-manifest epics are all released and don't need tracking. Flat-file convention aligns scanner path expectations with manifest.ts writer.

## Source
.beastmode/state/design/2026-03-29-bulletproof-state-scanner.md
.beastmode/state/design/2026-03-29-status-unfuckery-v2.md
