---
phase: plan
slug: logging-cleanup
epic: logging-cleanup
feature: tree-sink
wave: 3
---

# Tree Sink

**Design:** .beastmode/artifacts/design/2026-04-05-logging-cleanup.md

## User Stories

3. As a CLI user, I want to filter logs by epic and feature hierarchically (filtering by epic includes all its features), so that I can narrow output to the work I care about.

## What to Build

Replace the current `TreeLogger` class with a TreeSink that implements the LogSink interface.

**TreeSink** — receives LogEntry records and routes them into the existing TreeState structure. Uses the entry's context fields (epic, phase, feature) to determine placement in the tree hierarchy. Calls the existing `addEntry()` function on TreeState and notifies subscribers.

**Hierarchical filtering** — the TreeState already organizes entries by epic > phase > feature. The TreeSink preserves this by mapping LogEntry context into the tree structure. Filtering by epic (showing all its features) is a property of how the tree is queried, not how entries are inserted — this is already handled by the tree-view rendering layer.

**Construction** — consumers that currently create a `new TreeLogger(state, verbosity, context)` instead create a `Logger` with a `TreeSink` injected. The TreeSink receives the TreeState reference at construction.

**Verbosity** — TreeSink may implement its own verbosity gating (mirroring the old TreeLogger behavior) or pass all entries and let the tree-view rendering layer filter. Follow the design decision: sinks gate, so TreeSink should implement verbosity filtering.

## Acceptance Criteria

- [ ] TreeSink implements LogSink interface
- [ ] TreeSink routes entries to TreeState using context fields
- [ ] TreeSink notifies subscribers after adding entries
- [ ] TreeSink implements verbosity gating (filters debug at info level)
- [ ] TreeLogger class is removed — replaced by Logger + TreeSink
- [ ] All consumers of TreeLogger updated to use Logger with TreeSink
- [ ] Tree hierarchy (epic > phase > feature) is preserved in entry routing
