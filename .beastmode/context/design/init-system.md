# Init System

## Init Flow
- ALWAYS follow 5-phase order: skeleton install -> inventory -> write -> retro -> synthesize — invariant sequence
- ALWAYS run retro pass after writers even on fresh projects with empty state/ — no conditional gating
- NEVER spawn inventory/writer/retro agents in greenfield mode — skeleton only, then "start with /design"
- Writers and retros run in parallel (17 writers, 5 retros) — maximizes agent throughput while respecting phase boundaries

## Domain Detection
- ALWAYS detect all 17 L2 domains across 5 phases — Tier 1 + Tier 2 universal coverage
- NEVER include beastmode-specific domains in the skeleton — phase-transitions, task-runner, task-format are retro-created
- Inventory agent outputs JSON knowledge map with topics for all detected domains — structured handoff to writers

## Output Format
- ALWAYS produce ALWAYS/NEVER format in L2 files — matches retro agent output, unified format across the system
- ALWAYS produce Context/Decision/Rationale/Source format in L3 records — matches retro L3 record structure
- L1 format: summary paragraph + ALWAYS/NEVER bullets + path reference — matches synthesize agent output
- L2 templates use `[Populated by init or retro]` placeholders — compatible with retro's append pattern

## Skeleton Structure
- ALWAYS include 17 L2 files with matching L3 directories (.gitkeep) in skeleton — structural invariant for retro expansion
- NEVER put project-specific content in skeleton templates — templates are universal
- Every phase has at least 2 L2 files in the skeleton — minimum coverage guarantee
- Meta population included: process.md + workarounds.md per phase — init bootstraps the full hierarchy
