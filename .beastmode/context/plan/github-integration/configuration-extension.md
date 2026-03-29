# Configuration Extension

## Context
Phase transitions need configurable modes (human vs auto) and the project board name needs to be configurable. The existing `config.yaml` gate system needs extension for GitHub-backed transitions.

## Decision
Extend `config.yaml` with `transitions:` block (backlog-to-design through release-to-done, each set to human or auto) and `github:` section with `enabled` key (boolean, default false), `project-name` key, and Projects V2 metadata fields (project-id, field-id, option IDs). When `github.enabled` is false, all sync is silently skipped. Setup subcommand sets `enabled` to true and writes project metadata fields. Transitions block replaces implicit gate-only configuration for phase advancement. No cache file for Projects V2 metadata -- config.yaml is the single source.

## Rationale
Centralizes all transition mode decisions in one config file. Matches the existing gate configuration pattern. `github.project-name` allows customization per-project without code changes. Storing Projects V2 metadata in config eliminates the need for a separate cache file and lazy queries.

## Source
state/plan/2026-03-28-github-state-model.md
state/design/2026-03-28-github-state-model.md
state/design/2026-03-28-github-phase-integration.md
state/plan/2026-03-29-github-cli-migration-github-sync-engine.md
