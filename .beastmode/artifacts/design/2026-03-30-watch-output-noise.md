---
phase: design
slug: watch-output-noise
---

## Problem Statement

The `beastmode` CLI output is noisy and unstructured. 70 console.log/error calls across 13 files use inconsistent prefixing (`[watch]`, `[post-dispatch]`, `[beastmode]`), no filtering, and no way to control verbosity. During `beastmode watch` with multiple epics, the output is a wall of text that makes it hard to follow state transitions.

## Solution

Replace all ad-hoc console.log/error calls with a centralized, verbosity-gated logger. The logger uses per-epic scoped instances created via a factory function. Verbosity is controlled by stacking `-v` flags on any CLI command. Default output is quiet — only state transitions and errors.

## User Stories

1. As a pipeline operator, I want quiet default output showing only state transitions and errors, so that I can see what matters without noise.
2. As a pipeline operator, I want to increase verbosity with `-v`/`-vv`/`-vvv` flags, so that I can drill into details when debugging.
3. As a developer, I want a `createLogger(verbosity, slug)` factory that returns a scoped logger, so that call sites don't repeat the epic slug on every log call.
4. As a pipeline operator, I want consistent output format (`HH:MM:SS slug: message`) across all CLI commands, so that logs are easy to scan and grep.
5. As a pipeline operator, I want errors/warnings on stderr and info/debug on stdout, so that I can pipe normal output to a file and still see errors.
6. As a developer, I want all 70 console.log/error calls across 13 CLI files replaced with the new logger, so that there's one consistent logging path.
7. As a pipeline operator, I want non-epic messages (startup, shutdown, strategy selection) to use `beastmode` as the slug prefix, so that system-level events have a consistent format.

## Implementation Decisions

- Logger module: new `logger.ts` in `cli/src/` with `createLogger(verbosity: number, slug: string)` factory
- Logger methods: `log()` (level 0 — always shown), `detail()` (level 1 — `-v`), `debug()` (level 2 — `-vv`), `trace()` (level 3 — `-vvv`)
- Sub-details use indented format (two spaces before message, no slug prefix) for continuation lines
- Per-epic instances: watch loop creates `createLogger(v, epicSlug)` per dispatched epic; system-level uses `createLogger(v, "beastmode")`
- Verbosity tiers:
  - 0 (default): state transitions (`plan -> implement`), dispatch start/complete, errors
  - 1 (`-v`): adds per-feature dispatch details, cost/duration on completion
  - 2 (`-vv`): adds manifest enrichment steps, GitHub sync status, feature marking
  - 3 (`-vvv`): adds poll ticks, scan results, provenance checks, action derivation
- stderr/stdout: `log()` and `detail()`/`debug()`/`trace()` write to stdout; a separate `warn()` and `error()` always write to stderr regardless of verbosity
- Flag parsing: count `-v` occurrences in argv (`-v` = 1, `-vv` = 2, `-vvv` = 3, `-v -v -v` = 3)
- All CLI commands accept `-v` flags: watch, phase, cancel, status
- Same quiet default for manual `beastmode phase` as for `beastmode watch` — no special casing
- Remove existing `watchLog()`/`watchErr()` functions from watch.ts
- Remove all `[watch]`, `[post-dispatch]`, `[beastmode]` prefix patterns
- Timestamp format stays `HH:MM:SS` (existing behavior preserved)

## Testing Decisions

- Unit tests for the logger module: verify level gating (messages below verbosity threshold are suppressed)
- Unit tests for flag parsing: `-v`, `-vv`, `-vvv`, `-v -v`, no flags
- Integration-style tests: verify stderr/stdout split by capturing streams
- Existing tests for watch.ts and post-dispatch.ts should be updated to inject/mock the logger

## Out of Scope

- Log file output / file rotation
- Structured JSON log format
- Color/ANSI formatting for log levels
- config.yaml persistence of verbosity setting
- Quiet flag (`-q`) below default level

## Further Notes

- The status `--watch` dashboard (ANSI redraws) is separate from the logger — it writes directly to stdout and should not be affected by verbosity flags.
- post-dispatch.ts is used by both watch and manual phase commands — both paths use the same logger with the same rules.

## Deferred Ideas

- `--json` flag for machine-parseable structured log output
- Per-epic log files in `.beastmode/state/` for post-mortem debugging
- Color coding by verbosity level
