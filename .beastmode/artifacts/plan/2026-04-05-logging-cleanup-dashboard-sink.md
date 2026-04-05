---
phase: plan
slug: logging-cleanup
epic: logging-cleanup
feature: dashboard-sink
wave: 3
---

# Dashboard Sink

**Design:** .beastmode/artifacts/design/2026-04-05-logging-cleanup.md

## User Stories

4. As a dashboard user, I want the dashboard to receive the full log stream and apply its own filtering (default info, built-in UI controls), so that dashboard and CLI can have independent visibility settings.

## What to Build

Replace the current `createDashboardLogger()` function with a DashboardSink that implements the LogSink interface.

**DashboardSink** — receives all LogEntry records from the Logger (no gating at the Logger level). Routes entries to the existing FallbackEntryStore using the entry's context fields (epic, phase, feature) for keying. Also pushes to the system entries reference for aggregate mode.

**Entry store adaptation** — the FallbackEntryStore currently accepts a specific entry shape. Update it to accept LogEntry records or adapt the DashboardSink to transform LogEntry into the store's expected format.

**Dashboard verbosity** — the dashboard defaults to info-level display. The existing verbosity cycling UI (press 'v') toggles between info and debug (down from the old 4-level cycle). The DashboardSink receives everything; the display layer filters. Update the verbosity cycling logic to cycle between 2 levels instead of 4.

**Construction** — the dashboard command creates a Logger with a DashboardSink injected, instead of calling createDashboardLogger(). The dashboard command file needs to import and construct the new types.

## Acceptance Criteria

- [ ] DashboardSink implements LogSink interface
- [ ] DashboardSink receives all entries regardless of level (no gating)
- [ ] Entries are routed to FallbackEntryStore keyed by epic/phase/feature context
- [ ] System entries reference receives all entries for aggregate mode
- [ ] Dashboard verbosity cycles between info and debug (2 levels, not 4)
- [ ] Dashboard command constructs Logger with DashboardSink instead of createDashboardLogger()
- [ ] createDashboardLogger() is removed — no dead code
- [ ] Dashboard log panel renders entries from the new pipeline correctly
