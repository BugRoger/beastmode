# Release: remove-merge-logic-from-cli

**Version:** v0.40.0
**Date:** 2026-03-29

## Highlights

Removes all merge logic from the CLI. The beastmode CLI is now a pure phase dispatch orchestrator — it no longer makes irreversible git state changes on your behalf. Users handle squash-merging to main themselves.

## Features

- **Merge coordinator deleted** — Removed `merge-coordinator.ts` (328 lines) and all associated types, functions (simulateMerge, simulateAll, computeMergeOrder, executeMerge, coordinateMerges, mergeSingleBranch), and tests
- **Worktree ops stripped** — Removed `merge()` and `archive()` from `worktree.ts`; module reduced to create, enter, ensureWorktree, exists, remove
- **Watch fan-out simplified** — Implement fan-out dispatches all feature sessions to the same epic worktree instead of creating per-feature branches; removed `mergeCompletedFeatures()` and `featureResults` tracking
- **Release teardown simplified** — On successful release, calls `removeWorktree()` only (no archive, no merge)
- **Cancel command simplified** — Cancel skips archive step: remove worktree, update manifest, close GitHub

## Full Changelog

- `bae8285` design(remove-merge-logic-from-cli): checkpoint
- `06f49fe` plan(remove-merge-logic-from-cli): checkpoint
- `657824f` implement(delete-merge-coordinator): checkpoint
- `c1e11be` implement(simplify-watch-fanout): checkpoint
- `f1b4b51` implement(strip-worktree-ops): checkpoint
- `a94feab` validate(remove-merge-logic-from-cli): checkpoint
