# Branch Linking

## Context
GitHub's Development sidebar shows branches associated with an issue, but only when linked via the API. Pushed branches are not automatically linked. The `createLinkedBranch` GraphQL mutation both creates a remote branch and links it to an issue in one step.

## Decision
After pushing branches, a branch-link pipeline step calls `createLinkedBranch` to link feature branches to epic issues and impl branches to feature issues. This step is gated on `github.enabled` (unlike push, which is pure git). The GraphQL mutation requires node IDs (not REST API numbers), so two helpers resolve them: `ghRepoNodeId(repo)` and `ghIssueNodeId(repo, issueNumber)`.

The `createLinkedBranch` mutation silently returns `linkedBranch: null` when the branch already exists on the remote — the workaround is to delete the remote ref first (`git push origin --delete <branch>`), then call `createLinkedBranch` to recreate at the same SHA, which establishes the link. If the branch does not exist on remote, `createLinkedBranch` creates it directly. Error handling uses warn-and-continue — linking failures never block the pipeline. Epics/features without issue numbers in the manifest are skipped silently.

## Rationale
The delete-then-recreate workaround was verified experimentally against the GitHub API — there is no "link existing branch" mutation available. Node ID resolution is necessary because the GraphQL mutations do not accept REST-style "owner/repo" or issue numbers. Gating on `github.enabled` rather than unconditional execution prevents API calls in local-only workflows. Warn-and-continue maintains the principle that GitHub API failures never block local work.

## Source
.beastmode/artifacts/design/2026-04-05-github-sync-polish.md
