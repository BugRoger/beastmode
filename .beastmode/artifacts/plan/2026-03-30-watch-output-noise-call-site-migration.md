---
phase: plan
epic: watch-output-noise
feature: call-site-migration
---

# Call-Site Migration

**Design:** `.beastmode/artifacts/design/2026-03-30-watch-output-noise.md`

## User Stories

1. As a pipeline operator, I want quiet default output showing only state transitions and errors, so that I can see what matters without noise.
6. As a developer, I want all 70 console.log/error calls across 13 CLI files replaced with the new logger, so that there's one consistent logging path.
7. As a pipeline operator, I want non-epic messages (startup, shutdown, strategy selection) to use `beastmode` as the slug prefix, so that system-level events have a consistent format.

## What to Build

Replace all ~73 `console.log`/`console.error` calls across the 13 CLI source files with the appropriate logger method calls. This is a systematic file-by-file migration:

**Verbosity assignment per call site:** Each existing console call must be classified into the correct verbosity level based on what it communicates:
- Level 0 (`log`): State transitions (phase changes), dispatch start/complete, fatal errors
- Level 1 (`detail`): Per-feature dispatch details, cost/duration on completion
- Level 2 (`debug`): Manifest enrichment steps, GitHub sync status, feature marking
- Level 3 (`trace`): Poll ticks, scan results, provenance checks, action derivation

**Slug assignment per call site:** Epic-scoped messages use the epic slug. System-level messages (startup, shutdown, strategy selection, help text) use `"beastmode"` as the slug.

**Pattern removal:** All existing prefix patterns (`[watch]`, `[post-dispatch]`, `[beastmode]`, `[debug]`) are removed from message strings since the logger now handles slug prefixing.

**Error handling:** Existing `console.error` calls that represent warnings (non-fatal, warn-and-continue) migrate to `warn()`. Actual errors migrate to `error()`.

**Special case — status dashboard:** The status `--watch` dashboard writes directly to stdout via ANSI redraws and is NOT affected by the logger. It remains as-is.

**Test updates:** Existing tests for watch, post-dispatch, and other modules must be updated to inject or mock the logger rather than capturing raw console output.

## Acceptance Criteria

- [ ] Zero `console.log` or `console.error` calls remain in CLI source files (excluding tests)
- [ ] All `[watch]`, `[post-dispatch]`, `[beastmode]`, `[debug]` prefix patterns removed from message strings
- [ ] Default verbosity (no flags) shows only state transitions and errors
- [ ] System-level messages use `"beastmode"` slug
- [ ] Epic-scoped messages use the epic's slug
- [ ] Status `--watch` dashboard output is unchanged
- [ ] All existing tests pass with updated logger injection
