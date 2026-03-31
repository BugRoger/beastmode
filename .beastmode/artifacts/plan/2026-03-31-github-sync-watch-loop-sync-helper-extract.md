---
phase: plan
epic: github-sync-watch-loop
feature: sync-helper-extract
---

# Sync Helper Extract

**Design:** .beastmode/artifacts/design/2026-03-31-github-sync-watch-loop.md

## User Stories

1. As a pipeline operator, I want newly created GitHub issue numbers to be written back to the manifest, so that subsequent sync passes don't create duplicate issues. (US 3)
2. As a pipeline operator, I want the same sync code path for both manual and watch-loop execution, so that behavior is consistent regardless of dispatch strategy. (US 4)
3. As a pipeline operator, I want GitHub sync failures to warn and continue without blocking the pipeline, so that network issues don't halt autonomous execution. (US 5)

## What to Build

Extract a `syncGitHubForEpic()` helper function in the sync module that encapsulates the full sync lifecycle: load config, optionally discover GitHub metadata, call the stateless sync engine, apply returned mutations to the manifest via pure functions, persist via the manifest store, and catch all errors as warnings.

**Function signature:**
- Accepts project root, epic slug, and optional pre-resolved GitHub metadata (for callers that cache discovery)
- Accepts optional logger (defaults to global; watch loop passes per-epic prefixed logger)
- Returns void — all effects are side effects (disk writes, console warnings)

**Replace the inline sync block in post-dispatch** (currently ~18 lines of loadConfig/discoverGitHub/syncGitHub) with a single call to the new helper. Remove now-unused direct imports of syncGitHub, discoverGitHub, and loadConfig from that module.

**Mutation write-back:** After `syncGitHub()` returns, iterate `result.mutations` and apply each via `setGitHubEpic()` or `setFeatureGitHubIssue()` from manifest.ts, then persist with `store.save()`. This fixes the latent bug where newly created issue numbers are silently discarded.

**Error handling:** The entire helper body is wrapped in try/catch — any error becomes a console warning, never a thrown exception.

## Acceptance Criteria

- [ ] `syncGitHubForEpic()` exported from the sync module
- [ ] Helper encapsulates: config load, optional discovery, sync call, mutation apply, store save, warn-and-continue
- [ ] Optional `resolved` param skips `discoverGitHub()` when provided
- [ ] Optional `logger` param defaults to global logger
- [ ] Post-dispatch inline sync block replaced with single helper call
- [ ] Post-dispatch no longer imports syncGitHub, discoverGitHub, or loadConfig directly (unless needed for other purposes)
- [ ] Mutations are applied to manifest and persisted after sync
- [ ] Tests: helper calls syncGitHub and applies mutations
- [ ] Tests: helper skips discovery when resolved param provided
- [ ] Tests: helper catches errors and logs warning without throwing
- [ ] Tests: helper is a no-op when github.enabled is false
