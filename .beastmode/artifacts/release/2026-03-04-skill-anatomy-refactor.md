# Release v0.1.13

**Date:** 2026-03-04

## Highlights

Standardized skill anatomy across all workflow phases. All 5 phased skills (design, plan, implement, validate, release) now follow the same `0-prime → 1-execute → 2-validate → 3-checkpoint` sub-phase pattern, simplifying skill authoring and improving consistency.

## Breaking Changes

- Removed standalone `/prime` skill (absorbed into 0-prime sub-phase)
- Removed standalone `/research` skill (absorbed into 0-prime sub-phase)
- Removed standalone `/retro` skill (absorbed into 3-checkpoint sub-phase)

## Features

- Standard 4 sub-phase anatomy for all workflow skills
- Shared templates for consistent sub-phase structure (`skills/_shared/`)
- Context loading built into every phase via 0-prime
- Learnings capture built into every phase via 3-checkpoint

## Docs

- Updated `commands/*.md` with Anatomy section explaining sub-phase pattern
- Updated architecture.md with sub-phase anatomy documentation
- Updated structure.md with new skills directory layout (9 skills vs 12)
- Updated conventions.md with 0-indexed phase file naming

## Full Changelog

**Cycle artifacts:**
- Design: .agents/design/2026-03-04-skill-anatomy-refactor.md
- Plan: .agents/plan/2026-03-04-skill-anatomy-refactor.md
- Status: .agents/status/2026-03-04-skill-anatomy-refactor.md
