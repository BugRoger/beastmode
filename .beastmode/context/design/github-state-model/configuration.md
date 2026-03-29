# Configuration

## Context
GitHub sync must be optional and controllable without code changes. The github-no-for-real-sync design unifies config and cache — setup-github writes project metadata directly to config.yaml instead of a separate cache file, and repo is auto-detected from git remote.

## Decision
Config key github.enabled (default: false) controls whether GitHub sync happens. Config key github.project-name names the Projects V2 board. Setup-github writes project metadata directly to config.yaml under the github: section: project-id, project-number, field-id, and field-options (map of status name to option ID). The separate github-project.cache.json file is deleted. Config key github.repo stores owner/repo, auto-detected from `git remote get-url origin` via detectRepo() (supports HTTPS and SSH URLs) when not set. The detected value is cached in config.yaml so subsequent syncs don't shell out. When disabled, all GitHub steps are silently skipped and manifests are written without github blocks.

## Rationale
Config toggle ensures GitHub integration is opt-in. Default-off means beastmode works fully local out of the box. Config-driven rather than flag-driven keeps the control surface in one place. Unifying project metadata into config.yaml eliminates the cache file that the sync engine could never find (root cause of the original sync failure). Auto-detecting repo from git remote eliminates a manual configuration step that was never done.

## Source
.beastmode/artifacts/design/2026-03-28-github-state-model.md
.beastmode/artifacts/design/2026-03-28-github-phase-integration.md
.beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md
