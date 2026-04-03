---
phase: release
slug: structured-logging
epic: structured-logging
bump: minor
---

# Release: structured-logging

**Bump:** minor
**Date:** 2026-04-03

## Highlights

Replaces ad-hoc console.log calls with a structured logging system featuring Pino-pretty style output, child logger context merging, and a shared format function used across CLI and dashboard.

## Features

- Shared log format function (`shared/log-format.ts`) with fixed-width level labels and chalk color scheme
- Logger API with `createLogger()` and `.child()` context merging pattern
- All ~15 call sites migrated from raw console.log to structured logging API
- Dashboard ActivityLog component updated to use shared format function
- NO_COLOR and non-TTY detection for graceful degradation
- Null logger updated with `.child()` returning null logger

## Full Changelog

- `3eb1db4` design(structured-logging): checkpoint
- `88eed65` plan(structured-logging): checkpoint
- `d348e2f` implement(structured-logging-shared-format): checkpoint
- `d85a29c` implement(structured-logging-logger-api): checkpoint
- `b2bf552` implement(structured-logging-call-site-migration): checkpoint
- `aa50edd` implement(structured-logging-dashboard-format): checkpoint
- `682adf3` validate(structured-logging): checkpoint
