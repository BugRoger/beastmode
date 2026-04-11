# Commit Traceability

## Context
The original commit-issue-ref module amended only the HEAD commit after each phase checkpoint. This missed earlier commits in the same phase, leaving gaps in the GitHub issue timeline. Range-based amend fills every commit since the last phase tag with the appropriate issue reference.

## Decision
Range-based amend uses `git rebase --exec` to rewrite all commits since the last phase tag (`beastmode/<slug>/<previous-phase>`). Three new functions: `resolveRangeStart(slug, currentPhase)` finds the previous phase tag (falls back to merge-base with main for first phase), `resolveCommitIssueNumber(commitMessage, manifest)` routes each commit to the correct issue number (epic ref for phase checkpoints, feature ref for task commits detected by message prefix), and `amendCommitsInRange(rangeStart, manifest)` orchestrates the rebase. Commits already containing `(#N)` are skipped.

The amend step runs in the pipeline after manifest reconciliation and GitHub sync (so issue numbers are known) but before the push step. Since commits have not been pushed at amend time, the rebase rewrites local-only history — no force-push needed from the CLI. The backfill script is the sole place where force-push is permitted (for historical commits already on the remote).

Edge cases: first phase (design) has no previous phase tag — uses `git merge-base` with main. Empty rebases (all commits already have refs) no-op gracefully. PHASE_ORDER constant is used for previous-phase resolution.

## Rationale
Range-based amend ensures complete traceability: every commit appears in the GitHub issue timeline. Running before push eliminates the need for force-push, maintaining the CLI's no-force-push invariant. Issue number routing by commit message prefix leverages the existing convention (`feat(<feature>):` for impl tasks, `<phase>(<epic>):` for checkpoints) without introducing new metadata.

## Source
.beastmode/artifacts/design/2026-04-05-github-sync-polish.md
