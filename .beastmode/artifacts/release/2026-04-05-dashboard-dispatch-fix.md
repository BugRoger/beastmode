---
phase: release
slug: 67acde
epic: dashboard-dispatch-fix
bump: minor
---

# Release: dashboard-dispatch-fix

**Version:** v0.85.0
**Date:** 2026-04-05

## Highlights

Replaces the broken CLI fallback dispatch with a proper strategy-based dispatch system, adds verbosity cycling to the dashboard log panel, and introduces event log fallback entries for WatchLoop lifecycle events. Comprehensive Gherkin integration test suite covers all 22 dispatch scenarios.

## Features

- Wire WatchLoop lifecycle events into dashboard fallback entries
- Wire verbosity state through App component
- Wire FallbackEntryStore into buildTreeState and hook
- Filter log entries by verbosity in LogPanel
- Add verbosity indicator to key hints bar
- Add v key handler for verbosity cycling
- Add lifecycle-to-LogEntry converter and FallbackEntryStore
- Add verbosity utility module with cycling and filtering
- Wire selectStrategy into dashboard command
- Add step definitions for all 22 Gherkin scenarios
- Add 6 feature files with 22 Gherkin scenarios
- Add DashboardDispatchWorld and lifecycle hooks

## Fixes

- Remove broken CLI fallback from dispatchPhase
- Set strategy availability in Given steps, fix nonexistent strategy assertion
- Check dispatchError in CLI fallback error steps

## Full Changelog

```
0628463 validate(dashboard-dispatch-fix): checkpoint
a1ef8cd implement(dashboard-dispatch-fix-event-log-fallback): checkpoint
40660ce feat(event-log-fallback): wire WatchLoop lifecycle events into dashboard fallback entries
907effd implement(dashboard-dispatch-fix-verbosity-cycling): checkpoint
73bd3c9 feat(verbosity-cycling): wire verbosity state through App component
5d3cadd feat(event-log-fallback): wire FallbackEntryStore into buildTreeState and hook
9cad065 feat(verbosity-cycling): filter log entries by verbosity in LogPanel
33e3ae5 feat(verbosity-cycling): add verbosity indicator to key hints bar
88d9445 feat(verbosity-cycling): add v key handler for verbosity cycling
fde7090 feat(event-log-fallback): add lifecycle-to-LogEntry converter and FallbackEntryStore
c1a1959 feat(verbosity-cycling): add verbosity utility module with cycling and filtering
7fc55b0 implement(dashboard-dispatch-fix-strategy-dispatch): checkpoint
58b6848 fix(strategy-dispatch): remove broken CLI fallback from dispatchPhase
aabc76c feat(strategy-dispatch): wire selectStrategy into dashboard command
f5df7c0 implement(dashboard-dispatch-fix-integration-tests): checkpoint
ee0bc31 fix(integration-tests): set strategy availability in Given steps, fix nonexistent strategy assertion
222dc3c fix(integration-tests): check dispatchError in CLI fallback error steps
338e49e feat(integration-tests): add step definitions for all 22 scenarios
47e1abc feat(integration-tests): add step definitions for all 22 scenarios
69ee406 feat(integration-tests): add 6 feature files with 22 Gherkin scenarios
6f32588 feat(integration-tests): add DashboardDispatchWorld and lifecycle hooks
fc1c835 plan(dashboard-dispatch-fix): checkpoint
d6c2d86 design(dashboard-dispatch-fix): checkpoint
```
