# Release: init-redesign

**Version:** v0.16.0
**Date:** 2026-03-08

## Highlights

Replaced the narrow, hardcoded init agents with a 3-phase layered discovery system. Init now reads all available project knowledge — CLAUDE.md, README, docs, plans, source code, git history, config files — and populates the full `.beastmode/` context hierarchy with real, project-specific content at L1, L2, and L3 levels.

## Features

- New 3-phase init architecture: Inventory (single orchestrator) → Populate (parallel writers) → Synthesize (L1 summaries + CLAUDE.md rewrite)
- Inventory agent reads 7 source types and produces structured knowledge map with L2 topic assignments
- Writer agent creates L2 summaries following the fractal pattern plus L3 records with source attribution
- Synthesize agent generates real L1 summaries from L2 content and rewrites CLAUDE.md with @imports + residual
- Dynamic L2 topic discovery — proposes new topics when 3+ items cluster beyond the base set
- L3 records created from CLAUDE.md rules, existing plans, documentation, and git history
- Removed greenfield wizard mode — empty projects get skeleton and evolve through /design sessions

## Full Changelog

- Removed: `agents/init-stack.md`, `init-structure.md`, `init-conventions.md`, `init-architecture.md`, `init-testing.md`
- Removed: `skills/beastmode/references/wizard/question-bank.md`
- Created: `agents/init-inventory.md` (Phase 1 orchestrator)
- Created: `agents/init-writer.md` (Phase 2 parallel workers)
- Created: `agents/init-synthesize.md` (Phase 3 synthesis)
- Rewritten: `skills/beastmode/subcommands/init.md` (3-phase architecture)
- Updated: `skills/beastmode/SKILL.md` (init description)

## Artifacts

- Design: .beastmode/state/design/2026-03-08-init-redesign.md
- Plan: .beastmode/state/plan/2026-03-08-init-redesign.md
- Validate: .beastmode/state/validate/2026-03-08-init-redesign.md
