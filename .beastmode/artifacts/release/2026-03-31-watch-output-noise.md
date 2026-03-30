---
phase: release
slug: watch-output-noise
bump: minor
---

# Release: watch-output-noise

**Version:** v0.49.0
**Date:** 2026-03-31

## Highlights

Replaces 70 ad-hoc `console.log`/`console.error` calls across 13 CLI files with a centralized, verbosity-gated logger. Output is quiet by default — only state transitions and errors. Stack `-v` flags to drill into details when debugging.

## Features

- New `createLogger(verbosity, slug)` factory in `cli/src/logger.ts` with level-gated methods: `log()` (L0), `detail()` (L1), `debug()` (L2), `trace()` (L3), `warn()`/`error()` (stderr)
- `-v`/`-vv`/`-vvv` flag parsing on all CLI commands (watch, phase, cancel, status)
- Full call-site migration: all 70 `console.log`/`console.error` calls replaced with logger equivalents
- Consistent `HH:MM:SS slug: message` output format across all commands
- stderr/stdout split: warn/error always write to stderr, info/debug to stdout

## Fixes

- Restored feature-isolation guards removed during call-site migration (test regressions from missing guards)

## Full Changelog

- `e98ca4c` implement(logger-module): checkpoint
- `7ab4150` implement(flag-parsing): checkpoint
- `d183683` implement(call-site-migration): checkpoint
- `4654479` fix: restore feature-isolation guards removed during call-site-migration
- `4f590a6` plan(watch-output-noise): checkpoint
- `fb1d263` design(watch-output-noise): checkpoint
- `203d93e` validate(watch-output-noise): checkpoint
