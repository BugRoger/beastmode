---
phase: validate
slug: collision-proof-slugs
epic: collision-proof-slugs
status: passed
---

# Validation Report: collision-proof-slugs

**Date:** 2026-04-11

## Status: PASS

## Feature Completion

| Feature | Status |
|---------|--------|
| slug-derivation | completed |
| dead-code-cleanup | completed |
| prefix-resolution | completed |
| reconcile-in-place | completed |

## Tests

**Result: PASS** (no new failures)

| Metric | Branch | Main (baseline) |
|--------|--------|-----------------|
| Test files passing | 112 | 110 |
| Test files failing | 15 | 17 |
| Individual tests passing | 1721 | 1708 |
| Individual tests failing | 33 | 46 |

Branch is **better** than main — 13 fewer individual test failures, 2 fewer file-level failures.

### Feature integration tests: 21/21 GREEN
- `prefix-resolution.integration.test.ts` — 6/6
- `reconcile-in-place.integration.test.ts` — 3/3
- `slug-derivation.integration.test.ts` — 12/12

### Consumer test fixes applied during validation
Tests that hardcoded old slug format were updated to work with derived slugs:
- `prefix-resolution.integration.test.ts` — read back actual slugs instead of hardcoding
- `store-scan.test.ts` — use entity slugs from returned objects
- `store-import.test.ts` — regex patterns for slug format
- `store-import.integration.test.ts` — prefix matching for slug lookup
- `xstate-store-bridge.integration.test.ts` — use entity slug from created epic
- `consumer-migration.integration.test.ts` — read back actual slugs
- `early-issues.test.ts` — capture feature objects for slug access
- `sort-epics-by-date.integration.test.ts` — return derived slugs from helpers
- `cancel.test.ts` — use actual slug from created epic

### Pre-existing failures (33 individual, 15 file-level)
All in files NOT modified on this branch:
- 4 file-level failures: globalThis.Bun readonly (field-mapping-fix, reconciliation-loop, github-sync, reconcile)
- Tree rendering connector mismatches (tree-format-dashboard, log-panel, rendering-fixes, etc.)
- 1 it2-session reconciliation test
- 1 epics-tree-model color test
- 1 phase-dispatch branching test

## Types

**Result: PASS** (no new errors)

7 type errors — all pre-existing in files NOT modified on this branch:
- `epics-panel.test.ts` — unintentional comparison
- `github-discovery.test.ts` — unused declarations (3)
- `interactive-runner.test.ts` — unused import
- `EpicsPanel.tsx` — unused import
- `TreeView.tsx` — unused type

## Lint

**Result: SKIP** — not configured

## Custom Gates

**Result: SKIP** — none configured
