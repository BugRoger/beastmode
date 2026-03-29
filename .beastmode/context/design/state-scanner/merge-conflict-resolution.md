## Context
When multiple epics run in parallel worktrees, merged manifests can have git conflict markers, causing silent phase regressions or invisible epics.

## Decision
Before JSON.parse, check for conflict markers. If found, take ours-side content (before =======), strip marker lines, and attempt to parse. Pipeline dir is gitignored so conflicts only affect seed data.

## Rationale
Preserves epic visibility when git merges produce conflicts. Deterministic ours-side selection is predictable and debuggable.

## Source
.beastmode/artifacts/design/2026-03-29-bulletproof-state-scanner.md
