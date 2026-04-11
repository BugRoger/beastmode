---
phase: release
slug: unified-hook-context
epic: unified-hook-context
bump: minor
---

# Release: unified-hook-context

**Version:** v0.116.0
**Date:** 2026-04-12

## Highlights

Unifies all CLI hook context into five standardized `BEASTMODE_*` env vars and a structured metadata section in SessionStart. Renames `generate-output` to `session-stop` for naming symmetry. Pre-creates store entities before dispatch so IDs are available from the first hook invocation.

## Features

- Shared `buildEnvPrefix` function produces inline env var prefix for all command hooks
- All four hook builders (session-start, hitl-auto, hitl-log, stop) use unified env prefix
- SessionStart `additionalContext` includes structured metadata section with phase, entity IDs, parent artifacts, and output target path
- `computeOutputTarget` and `buildMetadataSection` exported for skill consumption
- Pipeline runner pre-creates store entity at Step 0 before dispatch
- `reconcileDesign` create-if-missing fallback removed — single entity creation path
- `generate-output.ts` renamed to `session-stop.ts` with `runSessionStop` entry point
- `SessionStartInput` extended with `epicId` and `featureId` optional fields
- HITL hooks read `BEASTMODE_PHASE` from env with positional arg fallback

## Fixes

- Complete session-stop rename in hooks.ts dispatcher and test APIs
- Use `epicId` from config instead of `epicSlug` in env context construction

## Chores

- Integration tests for session-stop-rename scenarios
- BDD portable-settings updated for new hook command strings
- Old `BEASTMODE_EPIC` / `BEASTMODE_SLUG` env var names removed from codebase

## Full Changelog

- `feat(env-prefix-helper)`: add shared buildEnvPrefix function with tests
- `feat(pre-create-entity)`: add pre-dispatch entity creation to pipeline runner
- `feat(pre-create-entity)`: remove reconcileDesign create-if-missing fallback
- `feat(session-start-metadata)`: extend SessionStartInput, refactor resolveArtifacts
- `feat(session-start-metadata)`: add computeOutputTarget and buildMetadataSection
- `feat(session-start-metadata)`: wire metadata section into assembleContext and update runSessionStart
- `fix(session-start-metadata)`: use epicId from config instead of epicSlug in envContext
- `fix(session-start-metadata)`: complete session-stop rename in hooks.ts, update test APIs
- `refactor(session-stop-rename)`: rename generate-output.ts to session-stop.ts
- `test(session-stop-rename)`: add integration test
- `validate(unified-hook-context)`: checkpoint
- `implement(unified-hook-context-session-start-metadata)`: checkpoint
- `plan(unified-hook-context)`: checkpoint (x2)
- `design(unified-hook-context)`: checkpoint
