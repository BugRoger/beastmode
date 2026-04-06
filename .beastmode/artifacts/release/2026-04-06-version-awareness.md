---
phase: release
slug: 14bf6a
epic: version-awareness
bump: minor
---

# Release: version-awareness

**Bump:** minor
**Date:** 2026-04-06

## Highlights

Consolidates version resolution into a single shared module sourced from plugin.json, eliminating scattered hardcoded version strings across CLI help and watch loop outputs.

## Features

- Shared version module resolving from plugin.json at runtime (`src/version.ts`)
- CLI help output uses shared version module instead of hardcoded string
- Watch loop status display uses shared version module

## Chores

- BDD integration tests for version-consolidation (6 scenarios, 21 steps)
- 29 new unit tests covering shared version module and consumers

## Full Changelog

- `ec5f6811` design(version-awareness): checkpoint
- `9cd0fddb` plan(version-awareness): checkpoint
- `b6592a14` test(version-consolidation): add BDD integration test (RED)
- `9ca4abfc` feat(version-consolidation): add shared version module
- `46eccc92` feat(version-consolidation): CLI help uses shared version module
- `860510a9` feat(version-consolidation): watch loop uses shared version module
- `21d84153` test(version-consolidation): update version-display tests for v{semver} format
- `bbb5527f` test(version-consolidation): update BDD feature description for plugin.json source
- `097dfa5d` implement(version-awareness-version-consolidation): checkpoint
- `9e327293` validate(version-awareness): checkpoint
