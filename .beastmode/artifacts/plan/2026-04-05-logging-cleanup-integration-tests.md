---
phase: plan
slug: logging-cleanup
epic: logging-cleanup
feature: integration-tests
wave: 1
---

# Integration Tests

**Design:** .beastmode/artifacts/design/2026-04-05-logging-cleanup.md

## User Stories

1. As a CLI user, I want a single Logger interface with four levels (debug/info/warn/error), so that the API is minimal and predictable.
2. As a CLI user, I want logs to carry structured data (message + key-value pairs), so that context like file paths, durations, and flags are machine-readable alongside human-readable messages.
3. As a CLI user, I want to filter logs by epic and feature hierarchically (filtering by epic includes all its features), so that I can narrow output to the work I care about.
4. As a dashboard user, I want the dashboard to receive the full log stream and apply its own filtering (default info, built-in UI controls), so that dashboard and CLI can have independent visibility settings.
5. As a developer, I want a pluggable sink model (StdioSink, DashboardSink, TreeSink) behind a single LogSink interface, so that adding a new transport means implementing one write() method without duplicating gating logic.
6. As a developer, I want all console.error/console.log calls in the CLI runtime (excluding standalone scripts) migrated to the Logger, so that no log output bypasses the structured logging pipeline.
7. As a developer, I want all existing log call sites reviewed and reclassified to the correct level (debug/info/warn/error), so that the default info output is clean and debug contains implementation details.

## What to Build

Write BDD integration specifications for the logging-cleanup epic. The integration artifact at `.beastmode/artifacts/plan/2026-04-05-logging-cleanup-integration.md` contains all Gherkin scenarios — 30 new scenarios across 7 feature files covering US 1-7, plus 5 modified scenarios in 2 existing feature files (dashboard-verbosity-cycling, dashboard-verbosity-indicator).

Create `.feature` files under `cli/features/` following the project's existing BDD conventions. Write step definitions that compile against the new Logger/LogSink/LogEntry types (these types will be defined by the core-logger feature in wave 2 — step definitions should import the expected interface shape).

Update the two existing feature files (dashboard-verbosity-cycling.feature, dashboard-verbosity-indicator.feature) to reflect the 4-level model replacing the 6-level model.

## Acceptance Criteria

- [ ] 7 new .feature files created under cli/features/ covering US 1-7
- [ ] 2 existing .feature files updated (dashboard-verbosity-cycling, dashboard-verbosity-indicator)
- [ ] Each Gherkin scenario traces back to a specific user story
- [ ] Step definitions compile (may reference types not yet implemented — that's expected at wave 1)
- [ ] No orphan scenarios — every scenario maps to a PRD user story
