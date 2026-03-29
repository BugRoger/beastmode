## Context
The CLI needs configuration for poll intervals, CLI-specific settings, optional cmux integration, and GitHub project metadata without introducing separate config files or cache files.

## Decision
Reuse `.beastmode/config.yaml` with `cli:`, `cmux:`, and `github:` sections. `cli.interval` controls poll interval (default 60 seconds). `cli.dispatch-strategy` controls dispatch mechanism (sdk | cmux | auto) — `auto` uses cmux if available, falls back to SDK. `github:` section stores: enabled, project-name, project-id, project-number, field-id, field-options (map of status name to option ID), and repo (auto-detected from git remote). Setup-github writes project metadata directly to config.yaml — the separate github-project.cache.json file is deleted. No per-notification or per-cleanup config knobs — notifications fixed at errors+blocks, cleanup fixed at on-release.

## Rationale
Single config field reduces cognitive overhead and configuration surface area. The `cli:` namespace avoids collision with existing config sections. Unifying project metadata into config.yaml eliminates the cache file that caused the original sync failure (sync engine read config.yaml but setup wrote to cache file). Auto-detecting repo from git remote eliminates manual configuration.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md`
`.beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md`
