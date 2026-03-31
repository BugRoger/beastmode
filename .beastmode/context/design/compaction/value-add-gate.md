# Value-Add Gate

## Context
Approximately 40% of L3 files are pure restatements of their parent L2 with no additional rationale or constraints. Prevention at the source is more effective than periodic cleanup.

## Decision
Before creating an L3 record, the context walker checks whether the content adds at least one of: (a) rationale not in the L2 summary, (b) constraints or edge cases narrowing the rule, (c) source provenance that would be lost, (d) dissenting context where the rule was debated or overridden. If none apply, the L3 proposal is silently skipped. Gate lives inside the context walker, not the orchestrator. When an L3 fails, the walker does nothing — no L2 enrichment, no record.

## Rationale
- Walker already has L2 in memory during deep-check, making comparison a natural extension
- Silent skip avoids noise — L2 already covers the finding
- Prevention stops new bloat independently of whether compaction ever runs

## Source
.beastmode/artifacts/design/2026-03-31-context-tree-compaction.md
