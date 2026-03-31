---
phase: design
slug: github-sync-watch-loop
---

## Problem Statement

The watch loop's ReconcilingFactory reconciles manifest state via XState but never calls syncGitHub(), so every epic running through the autonomous pipeline is invisible to GitHub. The project board shows epics stuck in old columns (e.g., "Implement" at 0%) despite being phase: "done" in local manifests. Some epics have no github field at all — sync never fired. Additionally, the new cancelled terminal state from the XState Pipeline Machine has no mapping in the sync engine, and returned mutations (newly created issue numbers) are silently discarded.

## Solution

Extract the GitHub sync pattern from post-dispatch.ts into a shared helper syncGitHubForEpic() in github-sync.ts. Wire it into both the watch loop (folded into reconcileState()) and manual (post-dispatch) paths. Fix the latent mutation write-back bug so newly created issue numbers persist to the manifest. Add cancelled phase handling to the board mapping, label list, and epic close logic.

## User Stories

1. As a pipeline operator, I want the project board to reflect actual epic state after autonomous watch loop execution, so that the board is trustworthy.
2. As a pipeline operator, I want cancelled epics to be closed on GitHub and moved to the Done column, so that terminal states are consistently represented.
3. As a pipeline operator, I want newly created GitHub issue numbers to be written back to the manifest, so that subsequent sync passes don't create duplicate issues.
4. As a pipeline operator, I want the same sync code path for both manual and watch-loop execution, so that behavior is consistent regardless of dispatch strategy.
5. As a pipeline operator, I want GitHub sync failures to warn and continue without blocking the pipeline, so that network issues don't halt autonomous execution.

## Implementation Decisions

- Extract syncGitHubForEpic() into github-sync.ts — encapsulates loadConfig → discoverGitHub → syncGitHub → apply mutations → warn-and-continue
- syncGitHubForEpic() accepts optional resolved: ResolvedGitHub param — caller owns discovery caching strategy; if provided, skips discoverGitHub() call
- syncGitHubForEpic() accepts optional logger: Logger param — defaults to global logger; watch loop passes per-epic prefixed logger, post-dispatch passes nothing
- Fold sync into reconcileState() in watch-command.ts — single load-save cycle per epic, no TOCTOU window between reconciliation and sync
- Replace inline sync block in post-dispatch.ts (lines 124-142) with the shared helper — removes unused imports of syncGitHub, discoverGitHub, loadConfig
- Apply SyncResult.mutations after sync: use setGitHubEpic() and setFeatureGitHubIssue() from manifest.ts, then store.save()
- Add cancelled: "Done" to PHASE_TO_BOARD_STATUS — cancelled epics go to Done column, no custom board column needed
- Add "phase/cancelled" to ALL_PHASE_LABELS — enables blast-replace cleanup
- Expand epic close check from === "done" to === "done" || === "cancelled"
- ghIssueEdit already exists with label/state support — no new gh.ts functions needed for this PRD
- Sync failures are console-only (warn-and-continue) — no manifest schema changes for error tracking

## Testing Decisions

- Add cancelled phase tests to github-sync.test.ts: board status mapping, epic close, label blast-replace
- Add syncGitHubForEpic helper tests: enabled/disabled config, warn-and-continue on error, mutation application to manifest, optional resolved param behavior
- Existing post-dispatch tests remain valid (they disable GitHub via config)
- Prior art: github-sync.test.ts has 14 test groups with comprehensive mocking of gh.ts functions

## Out of Scope

- Backfilling stale epics that already reached done without syncing
- Rate limiting for fan-out burst scenarios
- discoverGitHub() TTL caching implementation (caller-side concern, deferred)
- Commit-issue linking (separate PRD)
- Rich issue descriptions (separate PRD)

## Further Notes

The design context (DESIGN.md line 67) already states: "ALWAYS sync GitHub after every phase dispatch in the CLI — same code path for manual and watch-loop execution." The intent was always there; the implementation diverged when the watch loop was built with a separate reconciliation path.

## Deferred Ideas

- Commit-issue linking: add Refs #N to checkpoint commit body
- Rich issue descriptions: store summaries in manifest, format issue bodies from them, update on every sync pass
- discoverGitHub() TTL caching in watch loop scope — cache externally, pass resolved param
