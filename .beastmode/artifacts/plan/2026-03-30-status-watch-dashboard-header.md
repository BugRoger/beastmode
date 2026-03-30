---
phase: plan
epic: status-watch
feature: dashboard-header
---

# Dashboard Header

**Design:** .beastmode/artifacts/design/2026-03-30-status-watch.md

## User Stories

3. As a pipeline operator, I want to see blocked gate details in the live dashboard so that I know which epics need manual intervention and why.
4. As a pipeline operator, I want to see whether `beastmode watch` is currently running so that I know if the pipeline is being actively driven or just sitting idle.

## What to Build

Add a header section above the status table in watch mode that shows two pieces of operational context:

**Watch loop indicator:** Check the existing lockfile (via `readLockfile` from the lockfile module) to determine if `beastmode watch` is running. Display "watch: running" (green) or "watch: stopped" (dim) in the header.

**Blocked gate details:** For each epic that has a non-null `blocked` field, display the gate name and reason below the watch indicator. This gives the operator immediate visibility into which epics need manual intervention without needing to run individual status commands.

The header should render above the table on every watch tick. In one-shot mode, neither the watch indicator nor the blocked details section appears (one-shot already shows blocked status inline in the table).

## Acceptance Criteria

- [ ] Header shows "watch: running" when lockfile exists with a live PID
- [ ] Header shows "watch: stopped" when no lockfile or stale PID
- [ ] Blocked epics listed with gate name and reason
- [ ] Header only appears in watch mode, not in one-shot status
- [ ] Unit test for lockfile-based watch indicator logic
- [ ] Unit test for blocked details rendering from enriched manifests
