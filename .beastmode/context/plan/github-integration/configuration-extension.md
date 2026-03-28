# Configuration Extension

## Context
Phase transitions need configurable modes (human vs auto) and the project board name needs to be configurable. The existing `config.yaml` gate system needs extension for GitHub-backed transitions.

## Decision
Extend `config.yaml` with `transitions:` block (backlog-to-design through release-to-done, each set to human or auto) and `github:` section with `project-name` key. Transitions block replaces implicit gate-only configuration for phase advancement.

## Rationale
Centralizes all transition mode decisions in one config file. Matches the existing gate configuration pattern. `github.project-name` allows customization per-project without code changes.

## Source
state/plan/2026-03-28-github-state-model.md
state/design/2026-03-28-github-state-model.md
