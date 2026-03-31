---
phase: plan
epic: fullscreen-dashboard
feature: shared-data-extract
---

# Shared Data Extract

**Design:** .beastmode/artifacts/design/2026-03-31-fullscreen-dashboard.md

## User Stories

1. As a pipeline operator, I want to run `beastmode dashboard` and see all active epics with their phase, feature progress, and status on a single fullscreen terminal so that I have a complete picture of the pipeline at a glance.

## What to Build

Extract pure data functions from the status command into a shared module that both the status command and the new dashboard can consume. The shared module contains:

- **Phase ordering** — the canonical lifecycle ordering constant (cancelled → design → plan → implement → validate → release → done) used for sorting epic rows consistently across all views
- **Row building** — function that takes manifest data and options (show all vs active only) and returns sorted, filtered status rows with computed fields (phase, feature progress, blocked status)
- **Snapshot building** — function that extracts comparable fields (slug, phase, features completed/total, blocked) from status rows for change detection
- **Change detection** — function that compares two snapshots and returns the set of slugs that changed, enabling highlight-on-change in both the polling status view and the live dashboard

The status command's rendering layer (ANSI table formatting, color functions, screen composition) stays in the status command — only data-only functions move. The status command re-imports from the shared module so its behavior is fully preserved. No new functionality is added — this is a pure extraction refactor.

## Acceptance Criteria

- [ ] Shared module exports phase ordering, row building, snapshot building, and change detection functions
- [ ] status.ts imports all data functions from the shared module with zero behavior change
- [ ] Existing status tests pass with updated imports (or without changes if imports resolve transitively)
