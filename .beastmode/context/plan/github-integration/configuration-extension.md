# Configuration Extension

## Context
Phase transitions need configurable modes and the project board name needs to be configurable. The config.yaml needed extension for GitHub-backed settings.

## Decision
Extend `config.yaml` with `github:` section with `enabled` key (boolean, default false), `project-name` key, and Projects V2 metadata fields (project-id, field-id, option IDs). When `github.enabled` is false, all sync is silently skipped. Setup subcommand sets `enabled` to true and writes project metadata fields. Design is interactive by nature; all other phases auto-advance via the watch loop. No cache file for Projects V2 metadata -- config.yaml is the single source.

## Rationale
Centralizes all configuration in one config file. `github.project-name` allows customization per-project without code changes. Storing Projects V2 metadata in config eliminates the need for a separate cache file and lazy queries.

## Source
state/plan/2026-03-28-github-state-model.md
state/design/2026-03-28-github-state-model.md
state/design/2026-03-28-github-phase-integration.md
state/plan/2026-03-29-github-cli-migration-github-sync-engine.md
