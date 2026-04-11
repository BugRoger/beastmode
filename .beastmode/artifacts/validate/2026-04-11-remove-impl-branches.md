---
phase: validate
slug: remove-impl-branches
epic: remove-impl-branches
status: passed
---

# Validation Report: remove-impl-branches

**Date:** 2026-04-11

## Status: PASS

### Tests

- **Result:** PASS
- **Test files:** 123 passed, 4 failed (pre-existing `globalThis.Bun` readonly)
- **Individual tests:** 1735 passed, 0 failed
- **Pre-existing failures:** 4 file-level (unchanged from baseline)

### Types

- **Result:** PASS (no new errors)
- **Total errors:** 16 (all pre-existing in untouched files)
- **New errors introduced:** 0
- **Errors fixed during validate:** 2 (unused params in `commit-issue-ref.ts` and `branch-link.ts` after impl branch removal)

### Lint

- **Result:** SKIP (not configured)

### Custom Gates

#### Dead Import Verification

- **Result:** PASS
- `grep -rn 'implBranchName\|createImplBranch\|parseImplBranch\|ImplBranchParts' src/` — zero matches
- All removed symbols fully eliminated from production and test code

### Baseline Comparison

| Metric | Baseline (collision-proof-slugs) | Current | Delta |
|--------|----------------------------------|---------|-------|
| Test files passing | 112 | 123 | +11 |
| File-level failures | 15 | 4 | -11 |
| Individual tests passing | 1721 | 1735 | +14 |
| Individual test failures | 33 | 0 | -33 |
| Type errors | 7 | 16 | +9 (pre-existing) |
