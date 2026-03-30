---
phase: plan
epic: watch-output-noise
feature: logger-module
---

# Logger Module

**Design:** `.beastmode/artifacts/design/2026-03-30-watch-output-noise.md`

## User Stories

3. As a developer, I want a `createLogger(verbosity, slug)` factory that returns a scoped logger, so that call sites don't repeat the epic slug on every log call.
4. As a pipeline operator, I want consistent output format (`HH:MM:SS slug: message`) across all CLI commands, so that logs are easy to scan and grep.
5. As a pipeline operator, I want errors/warnings on stderr and info/debug on stdout, so that I can pipe normal output to a file and still see errors.

## What to Build

A new logger module exporting a `createLogger(verbosity: number, slug: string)` factory function. The factory returns an object with six methods:

- `log(msg)` — Level 0 (always shown). Writes to stdout with `HH:MM:SS slug: message` format.
- `detail(msg)` — Level 1 (shown at `-v`). Writes to stdout with same format.
- `debug(msg)` — Level 2 (shown at `-vv`). Writes to stdout with same format.
- `trace(msg)` — Level 3 (shown at `-vvv`). Writes to stdout with same format.
- `warn(msg)` — Always shown regardless of verbosity. Writes to stderr.
- `error(msg)` — Always shown regardless of verbosity. Writes to stderr.

Each level-gated method (log/detail/debug/trace) compares its level against the verbosity threshold and suppresses output if below. The `warn()` and `error()` methods bypass verbosity gating entirely.

Timestamp formatting reuses the existing `HH:MM:SS` pattern (slice ISO string). Sub-detail lines use indented format (two leading spaces, no slug prefix) as a secondary formatting option on the logger.

The existing `watchLog()`/`watchErr()` helper functions are removed as part of this feature — the logger subsumes their functionality.

## Acceptance Criteria

- [ ] `createLogger(0, "test")` returns a logger where `log()` writes to stdout and `detail()`/`debug()`/`trace()` are suppressed
- [ ] `createLogger(2, "test")` shows `log()`, `detail()`, and `debug()` but suppresses `trace()`
- [ ] All stdout output matches `HH:MM:SS slug: message` format
- [ ] `warn()` and `error()` always write to stderr regardless of verbosity level
- [ ] `watchLog()` and `watchErr()` functions are removed
- [ ] Unit tests verify level gating for all verbosity thresholds (0-3)
- [ ] Unit tests verify stderr/stdout stream separation
