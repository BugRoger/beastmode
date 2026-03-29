# Startup Reconciliation

**Design:** `.beastmode/state/design/2026-03-29-cmux-integration-revisited.md`

## User Stories

1. As an operator restarting `beastmode watch`, I want the watch loop to adopt still-running cmux surfaces from a previous session so agents aren't double-dispatched (US 5)

## What to Build

When `beastmode watch` starts with cmux strategy active, perform a reconciliation pass before entering the main poll loop. This prevents double-dispatching agents that are still running from a previous watch session.

**Discovery**: Call `CmuxClient.listWorkspaces()` to enumerate all existing cmux workspaces. Match workspace names against known epic slugs from the state scanner.

**Adoption**: For matching workspaces with live surfaces (process still running), register each surface's session in the `DispatchTracker` as an active session. The watch loop will then skip dispatching for these already-running phases/features. Populate the session handle with an `fs.watch` listener for the `.dispatch-done.json` marker so the adopted session integrates into the normal completion flow.

**Dead surface cleanup**: For surfaces where the process has exited but no `.dispatch-done.json` was written (crash scenario), close the surface via `CmuxClient.closeSurface()`.

**Empty workspace cleanup**: After processing all surfaces, if a workspace has no remaining surfaces, close it via `CmuxClient.closeWorkspace()`.

**Strategy-scoped**: This reconciliation only runs when `CmuxStrategy` is active. `SdkStrategy` has no persistent resources to reconcile. The reconciliation logic should be a method on `CmuxStrategy` called during watch loop initialization.

## Acceptance Criteria

- [ ] Reconciliation runs on watch startup when cmux strategy is active
- [ ] Live cmux surfaces matching known epics are adopted into DispatchTracker
- [ ] Adopted sessions have fs.watch listeners for marker-based completion
- [ ] Dead surfaces (exited process, no marker) are closed
- [ ] Empty workspaces are removed
- [ ] Non-matching workspaces (not beastmode epics) are left untouched
- [ ] Unit tests mock CmuxClient.listWorkspaces() and verify adoption/cleanup logic
- [ ] No reconciliation runs when SdkStrategy is active
