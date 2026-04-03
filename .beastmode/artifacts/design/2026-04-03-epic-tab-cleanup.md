---
phase: design
slug: epic-tab-cleanup
epic: epic-tab-cleanup
---

## Problem Statement

After an epic finishes its full lifecycle (design through release), the iTerm2 tab and cmux workspace persist as leftover windows. Split panes clean up correctly because each pane closes itself on phase completion, but the parent container (tab/workspace) survives because `cleanup()` is never called from the watch loop's teardown path. The same gap exists in both iTerm2 and cmux dispatch strategies.

## Solution

Wire `cleanup(epicSlug)` into ReconcilingFactory's existing release teardown block so that epic containers close automatically on successful release. Add error badges to lingering tabs on failed releases so users know why the tab persists. Close orphan containers during startup reconciliation when the manifest is already marked done.

## User Stories

1. As a user running the pipeline, I want epic tabs to close automatically when release succeeds, so that iTerm2 doesn't accumulate leftover windows.
2. As a user running the pipeline, I want failed release tabs to show an error badge on the tab itself, so I know which lingering tabs need attention.
3. As a user restarting the watch loop, I want orphan tabs from done epics to be cleaned up during startup reconciliation, so that crash recovery doesn't leave ghost windows.

## Implementation Decisions

- Cleanup call goes in ReconcilingFactory's release success block (`watch-command.ts`, inside the `if (opts.phase === "release" && sessionResult.success)` path), calling `this.inner.cleanup(epicSlug)` after worktree removal and manifest update
- Both `ITermSessionFactory.cleanup()` and `CmuxSessionFactory.cleanup()` already exist and work correctly — the bug is solely that nobody calls them
- For failed releases, set a badge on the tab session ID (not the pane) via `this.client.setBadge(tabSessionId, "ERROR: release failed")` so the user sees the error on the surviving container
- The failed-release badge requires the inner factory to expose a method for setting badges on epic-level containers (tab/workspace), since ReconcilingFactory doesn't know about visual surfaces directly
- Startup reconciliation (`reconcile()` in `ITermSessionFactory`) must cross-reference adopted `bm-*` sessions against manifest state — if manifest phase is "done", close the session instead of adopting it
- CmuxSessionFactory's reconcile (in `reconcile-startup.ts`) needs the same done-manifest check
- Manifest lookup during reconcile requires access to project root and the manifest store — reconcile methods may need additional parameters or a factory-level project root reference

## Testing Decisions

- Existing test files at `cli/src/__tests__/it2-session.test.ts` and `cli/src/__tests__/cmux-session.test.ts` already test `cleanup()` in isolation — extend with integration-style tests
- Test that ReconcilingFactory calls cleanup on successful release (mock inner factory, verify cleanup called)
- Test that ReconcilingFactory does NOT call cleanup on failed release
- Test that failed release sets badge on the tab session
- Test that reconcile closes tabs for done-manifest epics instead of adopting them
- Test that reconcile still adopts tabs for active epics (no regression)

## Out of Scope

- Dashboard-specific surface management (dashboard embeds its own watch loop but uses SDK dispatch, not iTerm2/cmux)
- General reconcile startup improvements beyond done-manifest detection
- Cleanup on epic cancellation (separate from release lifecycle)

## Further Notes

The root cause is an interface contract gap: `SessionFactory.cleanup()` exists as an optional method on the interface, and both concrete implementations implement it correctly, but the orchestration layer (ReconcilingFactory + watch loop) never invokes it. The fix is architectural wiring, not behavioral changes to the factories themselves.

## Deferred Ideas

None
