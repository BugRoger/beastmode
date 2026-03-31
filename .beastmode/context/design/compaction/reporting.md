# Reporting

## Context
Compaction changes need visibility for human review, especially flagged ambiguous cases.

## Decision
Compaction produces stdout summary for immediate visibility, plus full artifact at `artifacts/compact/YYYY-MM-DD-compaction.md`. In release context, also written to `artifacts/release/YYYY-MM-DD-<slug>-compaction.md`. Flagged items (ambiguous staleness) go in the report for human review — no automated resolution of ambiguous cases.

## Rationale
- Dual output (stdout + artifact) serves both immediate and archival needs
- Release-context artifact follows the existing artifacts/<phase>/ convention
- Human review for ambiguous cases preserves useful decision context that automated pruning might destroy

## Source
.beastmode/artifacts/design/2026-03-31-context-tree-compaction.md
