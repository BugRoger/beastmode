# File Collapse

## Context
When multiple source files are merged into a single target file, exported symbols can collide. When files are moved to new paths, consumers that import from the old paths must be discovered exhaustively.

## Decision
1. ALWAYS audit exported symbol namespaces across all files being absorbed into a single target before locking the collapse map in the plan — list every exported name from every source file, flag collisions, and specify rename resolutions in the plan
2. ALWAYS run full reverse-dependency analysis for every file being moved or deleted — grep for every old import path across the entire codebase, not just the obvious consumers in the same domain
3. ALWAYS include collision-resolution renames and complete consumer rewrite lists in plan task specifications — implementation agents should not discover these at execution time

## Rationale
cli-restructure domain-restructure feature had 8 auto-fixed deviations: 5 were name collisions from file collapses (splitSections, CmuxSurface/CmuxWorkspace, detectChanges), 2 were missed import consumers (lockfile.ts, 4 dashboard .tsx files), 1 was a merged import dedup. All were predictable from static analysis at plan time. Moving the discovery to plan phase eliminates implementation-time surprises and enables truly parallel wave execution without reconciliation.

## Source
.beastmode/artifacts/implement/2026-04-03-cli-restructure-domain-restructure.md
.beastmode/artifacts/plan/2026-04-03-cli-restructure-domain-restructure.md
