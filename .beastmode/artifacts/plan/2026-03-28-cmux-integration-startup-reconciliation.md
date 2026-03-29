# startup-reconciliation

**Design:** .beastmode/state/design/2026-03-28-cmux-integration.md
**Architectural Decisions:** see manifest

## User Stories

1. US 5: As an operator restarting `beastmode watch`, I want the watch loop to adopt still-running cmux surfaces from a previous session so agents aren't double-dispatched

## What to Build

A reconciliation step that runs when the watch loop starts (after lock acquisition, before the first tick). This step queries cmux for existing state and aligns it with the dispatch tracker.

**Reconciliation algorithm:**
1. If cmux is not available or disabled, skip entirely
2. List all cmux workspaces
3. For each workspace whose name matches a known epic slug:
   a. List surfaces in the workspace
   b. For each surface: check if the underlying process is still running
   c. **Live surface:** Create a `CmuxSession` for it and register in the `DispatchTracker` as an adopted session. The session's completion promise watches runs.json like normal.
   d. **Dead surface:** Close it via `CmuxClient`
4. For workspaces with no remaining surfaces after cleanup, remove the workspace
5. Log a summary: N surfaces adopted, M surfaces closed, K workspaces removed

The watch loop's existing double-dispatch prevention (via `DispatchTracker.hasPhaseSession` / `hasFeatureSession`) ensures adopted sessions block re-dispatch. When an adopted session's run entry appears in runs.json, the normal completion flow fires.

Edge case: If a surface's process is dead but no runs.json entry exists, the agent was killed without completing. Close the surface; the next tick will re-dispatch that phase/feature.

## Acceptance Criteria

- [ ] Reconciliation runs on watch start when cmux is available
- [ ] Live surfaces are adopted into DispatchTracker
- [ ] Dead surfaces are closed and their workspaces cleaned if empty
- [ ] Adopted sessions prevent double-dispatch on next tick
- [ ] Graceful skip when cmux unavailable or disabled
- [ ] Summary log of reconciliation actions
- [ ] Tests covering: adopt live, close dead, mixed workspace, cmux-unavailable skip
