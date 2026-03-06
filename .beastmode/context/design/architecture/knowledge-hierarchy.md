# Knowledge Hierarchy

## Context
Need to balance comprehensive context with token efficiency across multi-session workflows.

## Decision
Four-level progressive enhancement hierarchy: L0 (system manual, sole autoload), L1 (phase summaries, loaded at prime), L2 (full detail per topic, on-demand), L3 (records, linked from L2). No @imports between levels — convention-based paths only. Format standardized: L1 uses dense summaries + numbered rules grouped by L2 domains; L2 uses detailed summaries + domain-adapted rules grouped by L3 topics; L3 uses Context/Decision/Rationale/Source structure.

## Rationale
- L1 summaries provide enough context for most tasks without loading full detail
- On-demand L2 loading keeps token usage proportional to task complexity
- Standardized format makes every level predictable and machine-parseable

## Source
state/design/2026-03-04-progressive-l1-docs.md
state/design/2026-03-06-hierarchy-cleanup.md
state/design/2026-03-06-knowledge-hierarchy-format.md
state/design/2026-03-06-l0-rework.md
