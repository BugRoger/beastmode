# Release v0.12.2 — The Cleanup

**Date:** 2026-03-06

## Highlights

Standardized all skill files with consistent patterns for gate syntax, SKILL.md templates, context loading, announce text, and import semantics.

## Features

- Unified gate syntax: `[GATE|id]` / `[GATE-OPTION|mode]` replaces old `Gate:` format across all 20 gates
- Task runner placement standardized as first line in HARD-GATE block (not trailing @import)
- Standardized announce text and L1 link-following in all 5 workflow skill primes
- Import semantics documented: `@file` = mandatory import, `[name](path)` = reference link
- Gate syntax pattern documented in conventions.md

## Fixes

- Removed stale `Role Clarity` and `Load Prior Decisions` sections from design 0-prime
- Fixed prose `@` references in phase files (converted to markdown links)
- Removed `Execute ONLY` / `Remove non-matching` boilerplate from all gates

## Artifacts

- Design: .beastmode/state/design/2026-03-06-skill-cleanup.md
- Plan: .beastmode/state/plan/2026-03-06-skill-cleanup.md
- Validate: .beastmode/state/validate/2026-03-06-skill-cleanup.md
