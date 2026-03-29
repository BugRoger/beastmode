---
phase: design
slug: github-no-for-real-sync
---

## Problem Statement

The GitHub sync engine (`github-sync.ts`) was implemented and unit-tested (483 passing tests) but has never worked against a real repository. The board is completely out of sync with manifest state: 14 of 22 board items have no status set, closed epics show wrong board statuses (e.g., "Plan" instead of "Done"), phase labels are additive instead of blast-replaced, 30 zombie feature issues remain open from completed epics, features appear on an epics-only board, and no manifest has ever received a `github` block because the sync's mutation write-back was never wired in. Root causes: setup-github writes project metadata to a cache file (`github-project.cache.json`) but the sync engine reads from `config.yaml` (which was never populated), no code derives `github.repo` from git remotes, and `syncGitHub()` returns mutations that post-dispatch never applies.

## Solution

Fix the sync engine wiring at three levels: (1) unify config by having setup-github write project metadata directly to `config.yaml` and auto-detect the repo from `git remote get-url origin`, (2) move sync from a post-dispatch afterthought into a sync-on-save hook inside `store.save()` so every manifest mutation triggers a sync, (3) add a `beastmode sync` CLI command for manual full-reconciliation that reads all manifests and forces GitHub to match. The board becomes epics-only. Terminal states (done, cancelled) close all related issues.

## User Stories

1. As a pipeline operator, I want every manifest save to automatically sync GitHub state, so that the board and labels always reflect reality without relying on post-dispatch wiring.
2. As a developer, I want `beastmode sync` to reconcile all manifests against GitHub in a single pass, so I can fix drift and bootstrap a clean state.
3. As a pipeline operator, I want the repo (owner/name) auto-detected from `git remote get-url origin`, so I never have to manually configure it in every manifest.
4. As a developer, I want setup-github to write project metadata (project-id, project-number, field-id, field-options) directly to `config.yaml`, so the sync engine can read them without a separate cache file.
5. As a pipeline operator, I want cancelled epics to have their GitHub issue closed with a "cancelled" comment, so the board stays clean.
6. As a pipeline operator, I want done epics to close all child feature issues, so there are no zombie open features from shipped work.
7. As a pipeline operator, I want only epics on the Projects V2 board (no features), so the board remains a high-level pipeline view.

## Implementation Decisions

- **Sync-on-save**: Move sync trigger into `store.save()`. After writing the manifest to disk, if `github.enabled` is true, run `syncGitHub(manifest, config)` and apply any returned mutations (write-back epic/feature issue numbers) with a follow-up save. Guard against re-entrancy — the write-back save must not re-trigger sync. The `syncGitHub` call inside `store.save()` is fire-and-forget with warn-and-continue error handling.
- **Remove post-dispatch sync**: Delete the `syncGitHub` call from `post-dispatch.ts`. All sync now happens through save. Post-dispatch still handles manifest enrichment, phase advancement, and feature completion — it just doesn't sync directly.
- **Repo detection**: Add a `detectRepo(projectRoot)` function that runs `git remote get-url origin` and parses `owner/repo` from the URL (supports both HTTPS and SSH formats). Called once during sync-on-save if `config.github.repo` is not set. Caches the result in `config.yaml` so subsequent syncs don't shell out.
- **Config/cache unification**: Modify the setup-github skill to write project metadata directly to `config.yaml` under the `github:` section: `project-id`, `project-number`, `field-id`, and `field-options` (map of status name to option ID). Delete the `github-project.cache.json` file and all references to it.
- **Board policy — epics only**: Remove all feature-to-board sync from `syncGitHub()`. Features get labels only (type/feature, status/*). Only epics are added to the Projects V2 board and get their status field updated.
- **Terminal state — done**: When `manifest.phase === "done"`, close the epic issue AND close all child feature issues (regardless of their individual status). Set the epic's board status to "Done".
- **Terminal state — cancelled**: When `manifest.phase === "cancelled"`, close the epic issue with a comment "Cancelled". Close all child feature issues. Remove the epic from the board (or set status to "Done" — board doesn't have a "Cancelled" column).
- **Mutation write-back**: After `syncGitHub()` returns, iterate `result.mutations` and apply them: `setEpic` writes the `github` block to the manifest, `setFeatureIssue` writes the issue number to the feature's `github` block. Save the enriched manifest (with re-entrancy guard to avoid triggering sync again).
- **`beastmode sync` command**: New CLI command that lists all manifests via `store.list()`, then for each manifest runs `syncGitHub(manifest, config)` and applies mutations. Includes a `--clean` flag that additionally: closes open issues that don't correspond to any manifest, removes features from the board, and cleans up duplicate/stale labels. This is the one-shot reconciliation tool.
- **Re-entrancy guard**: `store.save()` uses a module-level flag (`_syncing = true/false`) to prevent the mutation write-back save from re-triggering sync. Simple, synchronous, no risk of concurrent saves in a single-threaded Bun process.
- **GitHub API client**: Keep `gh.ts` unchanged — the `gh` CLI wrapper is fine. The issue is wiring, not the API layer.
- **Error handling**: Unchanged — warn-and-continue throughout. Sync failures in `store.save()` log warnings but never block the save itself. The manifest is always written regardless of sync success.

## Testing Decisions

- Integration test the sync-on-save flow: mock `gh` at the process boundary, save a manifest, assert correct `gh` calls were made.
- Integration test mutation write-back: after sync creates an epic, verify the manifest on disk has the `github.epic` field.
- Integration test re-entrancy guard: verify the write-back save does not trigger a second sync.
- Integration test `beastmode sync` command: mock `gh`, seed multiple manifests in different states, run the command, verify all manifests are synced and mutations applied.
- Integration test `--clean` flag: seed zombie issues, run sync --clean, verify they're closed.
- Unit test `detectRepo()`: HTTPS URLs, SSH URLs, edge cases (no remote, non-GitHub remote).
- Prior art: existing tests in `cli/test/` use Bun's test runner with `gh` mocked at the spawn boundary.

## Out of Scope

- Bidirectional sync (reading GitHub state back into manifests)
- Webhook-based real-time sync
- Changing the label taxonomy (12-label system stays)
- Migrating setup-github from skill to CLI command
- Adding new board columns (e.g., "Cancelled")
- PR creation or any GitHub feature beyond issues/labels/board

## Further Notes

- The existing `github-project.cache.json` at `.beastmode/artifacts/github-project.cache.json` has valid project metadata (project-id, field-id, option IDs) that should be migrated to `config.yaml` by the implementation, not re-queried.
- The 30+ zombie open features from completed epics will be cleaned up by running `beastmode sync --clean` after implementation.
- The `status/review` label exists in GitHub but is not in the 12-label taxonomy. It should be removed during cleanup.

## Deferred Ideas

- `beastmode sync --watch` for continuous reconciliation (webhook alternative)
- Board column for "Cancelled" state (requires Projects V2 field update)
- Automated periodic sync on a cron (overkill when sync-on-save covers all mutations)
