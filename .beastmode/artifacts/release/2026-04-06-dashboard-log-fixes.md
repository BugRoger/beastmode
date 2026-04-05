---
phase: release
slug: ed09f0
epic: dashboard-log-fixes
bump: minor
---

# Release: dashboard-log-fixes

**Version:** v0.98.0
**Date:** 2026-04-06

## Highlights

Fixes dashboard logging quality across three fronts: CLI root entries now respect the verbosity filter, lifecycle events route to the correct log with proper severity levels, and the running plugin version renders below the clock in the header.

## Features

- feat(cli-verbosity-filter): filter CLI root entries through shouldShowEntry
- feat(event-routing-and-levels): add optional level field to LogEntry
- feat(event-routing-and-levels): set level and sessionId in lifecycleToLogEntry
- feat(event-routing-and-levels): remove dual-write, set correct log levels
- feat(version-display): capture version from started event in App state
- feat(version-display): render version below clock in header

## Docs

- docs(cli-verbosity-filter): remove stale CLI-passthrough comment

## Full Changelog

```
8bea7011 validate(dashboard-log-fixes): checkpoint
1ba40544 feat(version-display): render version below clock in header
d317ede5 implement(dashboard-log-fixes-event-routing-and-levels): checkpoint
3b458262 feat(event-routing-and-levels): remove dual-write, set correct log levels
484f777b feat(event-routing-and-levels): set level and sessionId in lifecycleToLogEntry
2367c9d8 feat(event-routing-and-levels): add optional level field to LogEntry
f9c71396 test(event-routing-and-levels): add integration test — RED
89a6adcd test(version-display): add BDD integration test — RED state
0c65653d feat(version-display): capture version from started event in App state
e36cdd75 implement(dashboard-log-fixes-cli-verbosity-filter): checkpoint
15c66879 docs(cli-verbosity-filter): remove stale CLI-passthrough comment
34234081 test(cli-verbosity-filter): add integration test
724a591e feat(cli-verbosity-filter): filter CLI root entries through shouldShowEntry
ec1c49d8 plan(dashboard-log-fixes): checkpoint
39175a89 design(dashboard-log-fixes): checkpoint
```
