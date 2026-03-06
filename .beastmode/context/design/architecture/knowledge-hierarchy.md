# Knowledge Hierarchy

## Context
Need to balance comprehensive context with token efficiency across multi-session workflows.

## Decision
Four-level progressive enhancement hierarchy: L0 (system manual, sole autoload), L1 (phase summaries, loaded at prime), L2 (full detail per topic, on-demand), L3 (records, linked from L2). Each level follows the fractal pattern: summary + child summaries + convention paths. No @imports between levels.

## Rationale
- L1 summaries provide enough context for most tasks without loading full detail
- On-demand L2 loading keeps token usage proportional to task complexity
- Fractal pattern makes every level self-similar and predictable

## Source
state/design/2026-03-04-progressive-l1-docs.md
