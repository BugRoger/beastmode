---
phase: plan
slug: logging-cleanup
epic: logging-cleanup
feature: call-site-migration
wave: 3
---

# Call Site Migration

**Design:** .beastmode/artifacts/design/2026-04-05-logging-cleanup.md

## User Stories

2. As a CLI user, I want logs to carry structured data (message + key-value pairs), so that context like file paths, durations, and flags are machine-readable alongside human-readable messages.
6. As a developer, I want all console.error/console.log calls in the CLI runtime (excluding standalone scripts) migrated to the Logger, so that no log output bypasses the structured logging pipeline.
7. As a developer, I want all existing log call sites reviewed and reclassified to the correct level (debug/info/warn/error), so that the default info output is clean and debug contains implementation details.

## What to Build

Migrate all ~100 existing log call sites across the CLI codebase to the new 4-level Logger interface with structured data support.

**Level reclassification** — every call site must be reviewed and assigned the correct level:
- `log()` calls → `info()` (operator-facing status)
- `detail()` calls → `debug()` (implementation details)
- `debug()` calls → `debug()` (already correct)
- `trace()` calls → `debug()` (implementation details)
- `warn()` calls → `warn()` (already correct)
- `error()` calls → `error()` (already correct, except known misclassification)
- **Known fix:** watch-loop.ts "State scan failed" currently `error()` → should be `warn()` (loop continues after scan failures)

**Structured data** — where call sites currently interpolate values into message strings, extract those values into the optional `data` parameter. Key candidates: file paths, durations, epic/feature names, phase names, counts, flags. Not every call site needs structured data — only add it where the interpolated values have diagnostic value.

**Console migration** — migrate the 4 direct console calls in CLI runtime:
- `args.ts` (3 console.error calls) — these fire before any logger exists. Create a bootstrap logger inline or restructure to throw an error that the caller handles with a logger. The design doc notes this needs special handling.
- `compact.ts` (1 console.error call) — replace with logger.error() using the existing logger available in that context.

**Scope exclusions:** standalone scripts in `scripts/` keep their console.log calls (per design). Test files are excluded. `process.stdout.write` for non-log output (ANSI escapes, JSON output, help text) is permitted.

## Acceptance Criteria

- [ ] All logger.log() calls replaced with logger.info()
- [ ] All logger.detail() calls replaced with logger.debug()
- [ ] All logger.trace() calls replaced with logger.debug()
- [ ] watch-loop.ts "State scan failed" changed from error() to warn()
- [ ] Structured data added to call sites where values were previously interpolated
- [ ] args.ts console.error calls migrated to use Logger (bootstrap pattern)
- [ ] compact.ts console.error call replaced with logger.error()
- [ ] Zero console.log/console.error calls in cli/src/ (excluding scripts/ and test files)
- [ ] process.stdout.write calls for non-log output (ANSI, JSON, help) are unchanged
- [ ] TypeScript compiles with no type errors after migration
