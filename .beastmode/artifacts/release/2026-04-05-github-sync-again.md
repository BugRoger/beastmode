---
phase: release
slug: github-sync-again
epic: github-sync-again
bump: minor
---

# Release: github-sync-again

**Version:** v0.94.0
**Date:** 2026-04-05

## Highlights

Adds retry queue and reconciliation loop to the GitHub sync engine — failed operations now queue with exponential backoff, and a periodic reconciliation pass detects and repairs drift between local state and GitHub.

## Features

- Integrate reconciliation pass into watch loop tick
- Add reconciliation engine with bootstrap and queue drain
- Enqueue failed ops in sync engine error paths
- Add retry-queue data model and pure functions
- enqueuePendingOp, drainPendingOps, resolvePendingOp
- PendingOp types, SyncRef extension, backoff calculation

## Fixes

- Add Bun global mocks to integration test
- Remove unused imports and parameters from retry queue
- Remove unused loadSyncRefs import from integration test
- Use epic-prefixed titles for stub issues
- Map store status to phase, build artifacts from flat fields

## Full Changelog

```
95f7143b validate(github-sync-again): checkpoint
218cd5f6 implement(github-sync-again-reconciliation-loop): checkpoint
5ce289fc fix(reconciliation-loop): add Bun global mocks to integration test
db9b2a0e feat(reconciliation-loop): integrate reconciliation pass into watch loop tick
5e099a20 implement(github-sync-again-retry-queue): checkpoint
cf718526 fix(retry-queue): remove unused imports and parameters
a7d5cf30 feat(reconciliation-loop): add reconciliation engine with bootstrap and queue drain
4b344312 implement(github-sync-again-field-mapping-fix): checkpoint
523bca0b fix: remove unused loadSyncRefs import from integration test
79cb3059 feat(retry-queue): enqueue failed ops in sync engine error paths
eab2cec6 test(sync): verify feature plan content populates body enrichment
a75863d9 fix(early-issues): use epic-prefixed titles for stub issues
b4c3365c feat(reconciliation-loop): add retry-queue data model and pure functions
f0329953 feat(retry-queue): enqueuePendingOp, drainPendingOps, resolvePendingOp
597b23e5 test(reconciliation-loop): add integration test scenarios (RED)
09fc5c0b fix(sync): map store status to phase, build artifacts from flat fields
cc4a9bdf test(field-mapping-fix): add integration tests for store field mapping (RED)
fdb5b29c feat(retry-queue): PendingOp types, SyncRef extension, backoff calculation
5f134a74 test(retry-queue): RED integration test from Gherkin scenarios
be2099b9 plan(github-sync-again): checkpoint
1383ac5e design(github-sync-again): checkpoint
```
