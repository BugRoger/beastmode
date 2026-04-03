---
phase: validate
slug: cli-restructure
epic: cli-restructure
status: passed
---

# Validation Report

## Status: PASS

### Tests

**Result: PASS** (no new failures)

| Metric | Branch | Baseline (main) | Delta |
|---|---|---|---|
| Pass | 1033 | — | — |
| Fail | 12 | 127 | -115 (improvement) |
| Hang | 1 file (watch.test.ts) | same | no change |

**New failures introduced: 0** (after fix)

3 tests in `phase-dispatch.test.ts` were updated to match the new unified pipeline architecture:
- `removeWorktree` assertions replaced with `runPipeline` delegation check (release teardown moved to pipeline runner)
- Single dispatch path assertion updated to expect 2 `runInteractive` calls (cmux direct + manual pipeline wrapper)

**Pre-existing failures (not in scope):**
- `logger.test.ts` (7 fails) — log format mismatch from v0.69.0 Watch Log Format release
- `watch-events.test.ts` (2 fails) — `release:held` event code accidentally deleted by v0.69.0
- `watch.test.ts` (hangs) — release serialization gate deleted by v0.69.0

### Types

**Result: PASS** (no new errors)

| Metric | Branch | Baseline (main) | Delta |
|---|---|---|---|
| Type errors | 28 | 52 | -24 (improvement) |

All remaining errors are in `__tests__/` and `dashboard/` — pre-existing, not touched by this epic.

### Lint

Skipped — not configured.

### Custom Gates

None configured.
