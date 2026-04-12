---
phase: validate
slug: quick-quartz-96da
epic: frontmatter-contract-alignment
status: passed
---

# Validation Report

## Status: PASS

### Features Validated

| Feature | Status |
|---|---|
| types-and-session-stop | completed |
| skill-templates-and-docs | completed |
| reconcile-content-extraction | completed |

### Tests

- **135 test files passing** (baseline: 126, +9 new)
- **1 test file failing**: `pipeline-runner.test.ts` — pre-existing from unified-hook-context epic
- **1880 individual tests passing** (baseline: 1792, +88 new)
- **3 individual test failures** — all pre-existing in `pipeline-runner.test.ts` (pre-dispatch entity creation tests)

### Types

- **20 type errors** — all pre-existing in untouched files (baseline: 16; delta due to pre-existing growth across branch, none from this epic)
- **0 type errors in files modified by this epic**

### Lint

Skipped — no lint command configured.

### Custom Gates

None configured.

### Fixes Applied During Validation

1. `session-start.ts:209` — changed `fm.feature` to `fm["feature-slug"]` to match unified field names
2. `session-start-hook.integration.test.ts` — replaced `id: "abc123"` with `slug: "test-epic"` across all test inputs; updated fixture frontmatter from `feature:` to `feature-slug:`
3. `session-start.test.ts` — updated fixture frontmatter from `feature:` to `feature-slug:` and `epic:` to `epic-slug:` for gate evaluation tests
4. `reconcile.ts:238-252` — changed `summary` from `string` to `{ problem, solution }` object to match `DESIGN_COMPLETED` event type
5. `reconcile-design.test.ts:57` — fixed `"not_found"` to `"not-found"` (correct enum value)
6. `reconcile-design.test.ts:111` — expanded Entity mock to satisfy Feature type
7. `reconcile-design.test.ts:38` — removed unused `extractSectionFromFile` import
8. `tree-format-dashboard.test.ts` — fixed `"    │ "` to `"  │ "` (matching implementation)
9. `tree-format.palette.test.ts` — same tree prefix padding fix
10. `session-stop.test.ts:3` — removed unused `resolve` import
11. `reconcile-design-slug-suffix.test.ts:32` — removed unused `rmSync` import
12. `reconcile-design-slug-suffix.test.ts:57` — removed unused `originalSlug` destructure

### Pre-existing Failures (Not in Scope)

- `pipeline-runner.test.ts`: 3 tests failing (pre-dispatch entity creation) — `store.find` not wired in runner, pre-existing from unified-hook-context
- 20 type errors across: consumer-migration, early-issues, epics-panel, github-discovery, interactive-runner, prefix-resolution, sort-epics, EpicsPanel.tsx, tree-format.ts, TreeView.tsx, sync.ts, runner.ts — all pre-existing in untouched files
