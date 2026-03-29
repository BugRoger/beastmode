# Release v0.13.0

**Date:** 2026-03-06

## Highlights

Progressive hierarchy fix restructures the `.beastmode/` knowledge architecture to have four L0 domain entry points (PRODUCT, CONTEXT, META, STATE) with lazy L1 loading by phase.

## Features

- Add CONTEXT.md as L0 domain entry for build context
- Add STATE.md as L0 kanban board with active features and release history
- Repurpose META.md from doc rules container to L0 domain entry for self-improvement
- Restructure CLAUDE.md to import only L0 files (PRODUCT, CONTEXT, META, STATE) plus doc rules
- Add placeholder L2 files for validate (quality-gates.md) and release (versioning.md)
- Convert state L1 files to full date-grouped artifact indices (57 design, 56 plan, 34 validate, 38 release)
- Remove state/status/ directory (superseded by STATE.md kanban)

## Full Changelog

- 5a3515d Design: progressive hierarchy fix
- (staged) Implementation of all 9 plan tasks across 4 waves
