# Release v0.8.0

**Date:** 2026-03-05

## Highlights

Restructures the meta domain to follow the same fractal L1/L2 hierarchy as context, with three L2 categories per phase (SOPs, overrides, learnings), retro classification, tiered HITL gates, and auto-promotion from learnings to SOPs.

## Features

- **Meta L2 hierarchy**: Created 15 L2 files (3 per phase × 5 phases) for SOPs, overrides, and learnings
- **Progressive L1 format**: Rewrote all 5 meta L1 files to summary + 3 section summaries + 3 @imports
- **Retro classification**: Updated retro-meta agent with Categories table, classification heuristics, and classified output format
- **Auto-promotion**: Retro agent detects recurring learnings (3+ sessions) and proposes promotion to SOPs
- **Tiered HITL gates**: Updated retro orchestrator with `retro.learnings-write` (INTERACTIVE), `retro.sops-write` (APPROVAL), `retro.overrides-write` (APPROVAL)
- **Documentation**: Added Meta Domain Structure section to META.md, updated architecture.md data flow and Related Decisions, updated structure.md directory layout

## Full Changelog

- `feat(meta-hierarchy)`: restructure meta domain to fractal L1/L2 hierarchy with classification, auto-promotion, and tiered HITL gates
