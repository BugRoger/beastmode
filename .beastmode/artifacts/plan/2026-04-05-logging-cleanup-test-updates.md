---
phase: plan
slug: logging-cleanup
epic: logging-cleanup
feature: test-updates
wave: 4
---

# Test Updates

**Design:** .beastmode/artifacts/design/2026-04-05-logging-cleanup.md

## User Stories

1. As a CLI user, I want a single Logger interface with four levels (debug/info/warn/error), so that the API is minimal and predictable.
2. As a CLI user, I want logs to carry structured data (message + key-value pairs), so that context like file paths, durations, and flags are machine-readable alongside human-readable messages.
3. As a CLI user, I want to filter logs by epic and feature hierarchically (filtering by epic includes all its features), so that I can narrow output to the work I care about.
4. As a dashboard user, I want the dashboard to receive the full log stream and apply its own filtering (default info, built-in UI controls), so that dashboard and CLI can have independent visibility settings.
5. As a developer, I want a pluggable sink model (StdioSink, DashboardSink, TreeSink) behind a single LogSink interface, so that adding a new transport means implementing one write() method without duplicating gating logic.

## What to Build

Update the existing unit test files to match the new 4-level Logger interface and sink model. This is the verification layer that confirms all wave 2-3 implementations are correct.

**logger.test.ts** — rewrite tests for the new 4-level interface. Test that Logger delegates to the injected LogSink. Test that LogEntry records include level, timestamp, msg, data, and context. Test child() context merging. Use a mock sink that captures entries instead of testing stdout/stderr directly (StdioSink gets its own tests).

**tree-logger.test.ts** — rename/rewrite as tree-sink.test.ts. Test that TreeSink implements LogSink, routes entries to TreeState, notifies subscribers, and handles verbosity gating.

**log-format.test.ts** — update format tests for 4 levels. Remove DETL and TRACE label tests. Verify INFO, DEBUG, WARN, ERR labels and colors.

**New: stdio-sink.test.ts** — test StdioSink verbosity filtering, stdout/stderr routing, and format output.

**New: dashboard-sink.test.ts** — test DashboardSink entry routing to FallbackEntryStore and system entries.

**Existing tests in other files** — any test file that creates a logger (via createLogger or TreeLogger) needs updating to use the new construction pattern. Identify these via grep for import statements.

## Acceptance Criteria

- [ ] logger.test.ts updated for 4-level interface with mock sink testing
- [ ] tree-logger.test.ts rewritten as tree-sink.test.ts for TreeSink
- [ ] log-format.test.ts updated for 4 levels (no DETL/TRACE)
- [ ] New stdio-sink.test.ts tests StdioSink filtering and routing
- [ ] New dashboard-sink.test.ts tests DashboardSink entry routing
- [ ] All tests that import Logger/createLogger updated for new interface
- [ ] All tests pass with no type errors
- [ ] No references to removed methods (log, detail, trace) in test files
