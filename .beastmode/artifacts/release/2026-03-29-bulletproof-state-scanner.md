# Release: bulletproof-state-scanner

**Version:** v0.30.0
**Date:** 2026-03-29

## Highlights

Rewrites the CLI state scanner as a single canonical implementation with manifest-first epic discovery, top-level phase tracking, and comprehensive test coverage. Eliminates the dual-scanner divergence that caused silent phase regressions in parallel worktree workflows.

## Features

- **Canonical scanner rewrite** — Single `state-scanner.ts` replaces divergent `scanEpicsInline()` in watch-command.ts; manifests are the sole epic anchor
- **Manifest phase field** — Top-level `manifest.phase` (plan|implement|validate|release|released) replaces marker files and the `phases` map as the single source of truth
- **Merge conflict auto-resolution** — Ours-side resolution strips git conflict markers before JSON.parse, preventing silent phase regressions from parallel worktree merges
- **Slug collision detection** — Warns on stderr when multiple manifests resolve to the same slug; uses newest manifest
- **Graceful empty state** — Missing or empty pipeline directories return an empty array instead of crashing
- **Scanner test suite** — Comprehensive unit tests covering every phase transition, conflict resolution, slug collision, empty state, and blocked feature detection

## Full Changelog

- design(bulletproof-state-scanner): checkpoint
- plan(bulletproof-state-scanner): 6 feature plans
- implement(bulletproof-state-scanner): all 6 features completed
- validate(bulletproof-state-scanner): 124 tests pass, 0 fail, clean type check
