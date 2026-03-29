# Configuration

## Context
GitHub sync must be optional and controllable without code changes.

## Decision
New config key github.enabled (default: false) controls whether GitHub sync happens at checkpoints. New config key github.project-name names the Projects V2 board. Setup-github subcommand sets github.enabled to true. When disabled, all GitHub steps are silently skipped and manifests are written without github blocks.

## Rationale
Config toggle ensures GitHub integration is opt-in. Default-off means beastmode works fully local out of the box. Config-driven rather than flag-driven keeps the control surface in one place.

## Source
.beastmode/artifacts/design/2026-03-28-github-state-model.md
.beastmode/artifacts/design/2026-03-28-github-phase-integration.md
