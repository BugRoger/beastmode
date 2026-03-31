# GitHub Sync in Watch Loop

## Context
The watch loop's ReconcilingFactory reconciles manifest state via XState but originally never called GitHub sync, leaving the project board stale. The sync code existed only in the manual post-dispatch path.

## Decision
Fold syncGitHubForEpic() into reconcileState() in watch-command.ts. Single load-save cycle per epic: reconcile XState state, sync GitHub, apply mutations, save — no TOCTOU window between reconciliation and sync. Same shared helper as post-dispatch, eliminating divergent code paths.

## Rationale
Separate reconciliation and sync paths caused the watch loop to silently skip GitHub updates. Folding sync into the reconciliation load-save cycle eliminates the race condition where another process could read the manifest between reconciliation and sync. The shared helper ensures behavioral parity between manual and autonomous execution.

## Source
.beastmode/artifacts/design/2026-03-31-github-sync-watch-loop.md
