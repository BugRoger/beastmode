# Skill Cleanup

## Context
Skills contained GitHub sync sections and manifest mutation logic, violating the principle that skills should be pure content processors. The shared utility `skills/_shared/github.md` centralized API calls but still required skills to invoke them.

## Decision
Delete `skills/_shared/github.md` entirely. Remove all "Sync GitHub" sections from checkpoint phase files. Remove all manifest read/write logic from skill files. Remove GitHub status updates from implement prime. Skills retain only phase output file writing. Setup-github skill unchanged (interactive, not part of dispatch pipeline). Verify zero remaining references to `gh` CLI, `github.md`, or manifest operations in skill files (excluding setup-github).

## Rationale
Skills as pure content processors means skill authors can modify logic without worrying about pipeline state. All GitHub and manifest operations are now CLI-owned, tested with standard TypeScript tooling rather than prompt-based verification.

## Source
state/plan/2026-03-29-github-cli-migration-skill-cleanup.md
state/plan/2026-03-28-github-cli-migration.manifest.json
