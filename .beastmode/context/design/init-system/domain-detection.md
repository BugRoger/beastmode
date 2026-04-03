# Domain Detection

**Date:** 2026-03-08
**Source:** state/design/2026-03-08-init-l2-expansion.md

## Context
The original init system only detected ~6 base domains. Expanding to the full L2 taxonomy required defining detection signals for all 17 domains.

## Decision
Inventory agent detects all 17 L2 domains (Tier 1 + Tier 2 universal) with specific detection signals per domain. Beastmode-specific domains (phase-transitions, task-format) excluded from skeleton -- retro creates those. Detection signals include entity classes, error middleware, CI configs, build scripts, coverage thresholds, version fields, changelogs, deploy configs, and registry settings.

## Rationale
Going broad (all Tier 1 + Tier 2) lets retro prune empty L2s over time rather than guessing upfront which domains a project needs. Excluding beastmode-specific domains keeps the skeleton universal.
