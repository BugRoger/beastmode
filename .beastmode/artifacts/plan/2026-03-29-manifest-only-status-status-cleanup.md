# Status Cleanup

**Design:** .beastmode/state/design/2026-03-29-manifest-only-status.md
**Architectural Decisions:** see manifest

## User Stories

1. As a user running `beastmode status`, I see only active epics (those with manifests) so the table is actionable instead of 100+ rows of noise

## What to Build

Simplify `commands/status.ts` to work with the updated scanner output. Remove the run log dependency entirely: delete `readRunLog()`, `lastActivity()` (run-log-based), and `formatCost()`. Drop the `Cost` column from `StatusRow` interface and the table output.

Replace the Last Activity column source: instead of scanning the run log for the most recent timestamp per epic, use `epic.lastUpdated` from `EpicState` (populated by the scanner from `manifest.lastUpdated`). Format it the same way (YYYY-MM-DD HH:MM:SS).

Update `buildStatusRows()` to no longer accept a run log parameter — it only needs the epics array. Sort by `lastUpdated` instead of run log timestamps.

Remove the `RunLogEntry` import from status.ts since it's no longer used.

## Acceptance Criteria

- [ ] readRunLog removed from status.ts
- [ ] formatCost removed from status.ts
- [ ] Cost column removed from StatusRow and table output
- [ ] Last Activity uses epic.lastUpdated from EpicState
- [ ] buildStatusRows takes only epics (no run log parameter)
- [ ] statusCommand no longer reads .beastmode-runs.json
- [ ] Table output matches expected format (5 columns: Epic, Phase, Progress, Blocked, Last Activity)
