---
phase: plan
epic: github-no-for-real-sync
feature: sync-on-save
---

# sync-on-save

**Design:** .beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md

## User Stories

1. As a pipeline operator, I want every manifest save to automatically sync GitHub state, so that the board and labels always reflect reality without relying on post-dispatch wiring.

## What to Build

Move the sync trigger from post-dispatch into `store.save()` so every manifest mutation automatically syncs to GitHub.

**Save-triggered sync:** After `store.save()` writes the manifest JSON to disk, if `github.enabled` is true in config, call `syncGitHub(manifest, config)`. This is fire-and-forget with warn-and-continue — sync failures never block the save.

**Mutation write-back:** After `syncGitHub()` returns, iterate `result.mutations` and apply them to the manifest using the existing pure functions (`setGitHubEpic`, `setFeatureGitHubIssue`). Write the enriched manifest back to disk. This write-back save must NOT re-trigger sync.

**Re-entrancy guard:** Use a module-level boolean flag (`_syncing`) in `manifest-store.ts`. Set it true before calling sync, false after. The write-back save checks this flag and skips sync when true. Simple, synchronous, safe in single-threaded Bun.

**Remove post-dispatch sync:** Delete the `syncGitHub()` call and related mutation-handling code from `post-dispatch.ts`. Post-dispatch still handles manifest enrichment, phase advancement, and feature completion — it just calls `store.save()` which now triggers sync implicitly.

**Repo resolution integration:** Before calling `syncGitHub`, if `manifest.github?.repo` is not set, call `detectRepo()` (from config-unification feature) to resolve it. If detected, write it to the manifest's github block before syncing.

## Acceptance Criteria

- [ ] Every `store.save()` call triggers `syncGitHub()` when github is enabled
- [ ] Mutation write-back enriches manifest with epic/feature issue numbers
- [ ] Write-back save does not re-trigger sync (re-entrancy guard works)
- [ ] Post-dispatch no longer calls syncGitHub directly
- [ ] Sync failures in store.save() log warnings but never throw or block the save
- [ ] Repo is auto-detected on first sync if not already in manifest
