# Release v0.3.6

**Date:** 2026-03-04

## Highlights

Improved /plan skill based on competitive analysis with superpowers and GSD. Fixed structural duplication, added task dependency model with wave-based parallelism, and enhanced validation with design coverage verification.

## Features

- Add wave-based task dependency model to plan task format (`Wave`, `Depends on` fields)
- Add design coverage verification table to plan validation phase
- Add structured skill handoff directive (`> For Claude: Use /implement`) to plan header template
- Bump session banner version to v0.3.6

## Fixes

- Remove duplicate "Explore Codebase" step from plan 0-prime (belongs in 1-execute only)
- Remove stale worktree entry from plan 1-execute (referenced dead `.agents/status/` path)
- DRY task format by referencing `@../references/task-format.md` instead of inline template

## Full Changelog

- feat(plan): add wave/dependency model to task format
- feat(plan): add design coverage check to validation
- feat(plan): add skill routing directive to plan header
- fix(plan): remove duplicate explore step from 0-prime
- fix(plan): remove stale worktree entry from 1-execute
- refactor(plan): DRY task format reference in 1-execute
