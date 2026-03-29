---
phase: plan
epic: github-no-for-real-sync
feature: sync-command
---

# sync-command

**Design:** .beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md

## User Stories

2. As a developer, I want `beastmode sync` to reconcile all manifests against GitHub in a single pass, so I can fix drift and bootstrap a clean state.

## What to Build

A new CLI command that performs a full reconciliation of all manifests against GitHub.

**Base command (`beastmode sync`):** Lists all manifests via `store.list()`, then for each manifest calls `syncGitHub(manifest, config)` and applies returned mutations (writing enriched manifests back). Prints a summary of what was synced: issues created, labels updated, board statuses set. This is the manual trigger for when sync-on-save has drifted or for initial bootstrap.

**Clean flag (`beastmode sync --clean`):** In addition to the base sync, performs cleanup:
- Closes open GitHub issues that don't correspond to any active manifest (zombie issues from completed/cancelled epics)
- Removes features from the Projects V2 board (enforcing epics-only policy)
- Cleans up stale/duplicate labels (e.g., the `status/review` label that exists but isn't in the taxonomy)

**Implementation:** Queries GitHub for all open issues with `type/epic` or `type/feature` labels, cross-references against manifests, and closes orphans. For board cleanup, lists all project items and removes any that correspond to feature issues.

**Registration:** New command file registered in the CLI router alongside existing commands. Uses `findProjectRoot()` and `loadConfig()` like other commands.

**Output:** Human-readable summary with counts. Verbose enough to understand what happened, terse enough to scan.

## Acceptance Criteria

- [ ] `beastmode sync` syncs all manifests to GitHub
- [ ] Mutations are applied (epic/feature issue numbers written back to manifests)
- [ ] Summary shows counts: issues created, labels updated, board statuses set
- [ ] `beastmode sync --clean` closes orphan issues not in any manifest
- [ ] `beastmode sync --clean` removes features from the project board
- [ ] `beastmode sync --clean` removes stale labels
- [ ] Command is registered in CLI help text
- [ ] Warn-and-continue: failures don't abort the full sync pass
