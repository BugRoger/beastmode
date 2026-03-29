# Release v0.9.0

**Date:** 2026-03-05

## Highlights

Retro agents now dynamically discover review targets by walking the L1/L2 knowledge hierarchy instead of using hardcoded file tables. This makes the retro system self-adapting as documentation structure evolves.

## Features

- **Dynamic context walker**: Reads L1 summary files, parses @imports to discover L2 detail files, and reviews each against session artifacts. Detects orphaned L2 files and suggests new documentation.
- **Dynamic meta walker**: Walks meta hierarchy to capture learnings, check existing entries for staleness, detect cross-feature patterns, and flag promotion candidates.
- **Self-discovering retro orchestrator**: Passes L1 file paths to walker agents instead of hardcoded file lists. Agents discover their own review targets from the hierarchy structure.

## Full Changelog

- `feat(dynamic-retro-walkers)`: Replace hardcoded retro agents with structure-walking agents
  - Rewrite `agents/retro-context.md` with Discovery Protocol
  - Rewrite `agents/retro-meta.md` with Discovery Protocol + staleness/promotion
  - Update `skills/_shared/retro.md` to pass L1 paths in Session Context
