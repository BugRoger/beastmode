---
phase: release
slug: logging-cleanup
epic: logging-cleanup
version: v0.91.0
---

# Release: logging-cleanup

**Version:** v0.91.0
**Date:** 2026-04-05

## Highlights

Unified logging system with a single 4-level Logger interface (debug/info/warn/error), pluggable sink model (StdioSink, DashboardSink, TreeSink), structured log entries with key-value data, and full call-site migration from six ad-hoc logger implementations to one.

## Features

- feat(core-logger): update LogLevel to 4 levels and formatLogLine labels
- feat(core-logger): add LogEntry, LogSink, StdioSink, rewrite Logger to 4-level interface
- feat(dashboard-sink): add DashboardSink implementing LogSink
- feat(dashboard-sink): reduce verbosity cycle to 2 levels (info/debug)
- feat(dashboard-sink): wire DashboardSink into dashboard command and remove createDashboardLogger
- feat(tree-sink): add createTreeSink factory with tests
- feat(call-site-migration): update TreeLogger to 4-level interface
- feat(call-site-migration): update DashboardLogger to 4-level interface
- feat(call-site-migration): update createLogger calls to sink-based API
- feat(call-site-migration): replace logger.log() with logger.info()
- feat(call-site-migration): replace logger.detail() with logger.debug()
- feat(call-site-migration): fix State scan failed level, migrate console calls
- feat(call-site-migration): add structured data to log call sites
- feat(call-site-migration): update test files for 4-level Logger interface
- feat(test-updates): fix pipeline-runner nullLogger mock for 4-level API
- feat(test-updates): fix early-issues nullLogger mock for 4-level API
- feat(test-updates): fix sync-helper customLogger mock for 4-level API
- feat(logging-cleanup): add feature files for US1-7 integration tests
- feat(logging-cleanup): add step definitions and cucumber profiles

## Fixes

- fix(tree-format): align LEVEL_LABELS with 4-level LogLevel
- fix(dashboard-sink): use vitest import in verbosity test
- fix(call-site-migration): fix remaining old logger API references

## Chores

- refactor(tree-sink): replace TreeLogger with Logger+TreeSink in consumers
- implement/validate/plan/design checkpoint commits

## Full Changelog

daade3c4..d61d42cd (32 commits across 6 features: core-logger, dashboard-sink, tree-sink, call-site-migration, test-updates, integration-tests)
