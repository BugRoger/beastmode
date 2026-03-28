# Config and Setup

**Design:** .beastmode/state/design/2026-03-28-github-phase-integration.md
**Architectural Decisions:** see manifest

## User Stories

1. As a developer, I want to run `/beastmode setup-github` to bootstrap labels and a project board, so that my repo is ready for GitHub-synced workflows.
8. As a developer, I want GitHub API failures to warn and continue without blocking my workflow, so that network issues never stop me from making progress.

## What to Build

Extend config.yaml with a `github:` section containing `enabled` (boolean, default false) and `project-name` (string, default "Beastmode Pipeline"). All phase checkpoints will read `github.enabled` to decide whether to run GitHub sync steps.

Update the existing setup-github subcommand to:
- Drop the `status/review` label from the label taxonomy (12 labels total, not 13)
- After successful label + board creation, write `github.enabled: true` to config.yaml
- Verify the config write succeeded

The setup subcommand already handles label creation, project board creation, and repo linking. These remain unchanged except for the label removal and the config write addition.

## Acceptance Criteria

- [ ] config.yaml has `github.enabled: false` and `github.project-name: "Beastmode Pipeline"` keys
- [ ] setup-github creates 12 labels (not 13 — no status/review)
- [ ] setup-github writes `github.enabled: true` to config.yaml after success
- [ ] Running setup-github twice is idempotent — no errors, no duplicates
