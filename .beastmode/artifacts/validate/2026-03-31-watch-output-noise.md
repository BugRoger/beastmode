---
phase: validate
slug: watch-output-noise
status: passed
---

# Validation Report

## Status: PASS

### Tests

**Result: PASS** — 749 pass, 0 fail (37 files, 1407 assertions, 8.94s)

### Types

**Result: PASS** — `bun x tsc --noEmit` clean, 0 errors

### Lint

Skipped — not configured.

### Custom Gates (Design Acceptance Criteria)

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Logger module at `cli/src/logger.ts` with `createLogger(verbosity, slug)` factory | PASS |
| 2 | Logger methods: `log()` (L0), `detail()` (L1), `debug()` (L2), `trace()` (L3), `warn()`/`error()` (stderr) | PASS |
| 3 | Flag parsing: `-v`=1, `-vv`=2, `-vvv`=3, `-v -v -v`=3 | PASS |
| 4 | All `console.log`/`console.error` removed from `src/` | PASS |
| 5 | Old `watchLog`/`watchErr` functions removed from `watch.ts` | PASS |
| 6 | Old `[watch]`/`[post-dispatch]`/`[beastmode]` prefix patterns removed | PASS |
| 7 | Timestamp format `HH:MM:SS` in logger output | PASS |
| 8 | stderr/stdout split: warn/error to stderr, log/detail/debug/trace to stdout | PASS |

### Notes

Initial validation run found 3 regressions from the call-site-migration feature (2 test failures, 1 type error). All traced to removal of feature-isolation guards during the logger migration. Fixed in commit `4654479` and all gates now pass.
