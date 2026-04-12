---
phase: design
epic-id: bm-c861
epic-slug: github-sync-bug-fixes-c861
epic-name: GitHub Sync Bug Fixes
---

## Problem Statement

GitHub issue sync produces three visible defects: issue bodies display a redundant `**Phase:**` badge that duplicates the phase label, artifact link tables render local filesystem paths instead of GitHub permalinks, and commit-to-issue linking via `(#N)` message amending is completely non-functional despite the code existing in the pipeline.

## Solution

Remove the phase badge from all issue body formatting (epic bodies, feature bodies, early stubs) since labels are the canonical phase indicator. Ensure artifact links always resolve to GitHub permalink URLs using phase tag SHAs, with plain repo-relative path as the fallback. Fix the silent failures in `amendCommitsInRange` by adding diagnostic logging at every exit point and resolving whatever root cause surfaces (likely sync ref population timing or range start resolution).

## User Stories

1. As a user viewing an epic issue on GitHub, I want the body to not repeat the phase that's already shown in the labels, so that the issue body is clean and focused on content.
2. As a user viewing an epic issue on GitHub, I want artifact links to be clickable GitHub permalinks (or at minimum repo-relative paths), so that I can navigate to the artifact directly.
3. As a user browsing commit history on GitHub, I want every phase checkpoint commit and implementation commit to include an `(#N)` issue reference, so that commits are linked to their parent epic or feature issue.

## Implementation Decisions

- Remove `**Phase:** ${input.phase}` line from `formatEpicBody()` in `cli/src/github/sync.ts`
- Remove `**Phase:** design` from early issue stub body in `cli/src/github/early-issues.ts`
- In `buildArtifactsMap()`, ensure any legacy absolute or worktree-relative paths are sanitized to repo-relative format (extract basename, prepend `.beastmode/artifacts/<phase>/`)
- In `resolveArtifactLinks()`, the existing tag-based permalink approach is correct — no change to the strategy, just ensure `buildArtifactsMap` feeds clean paths
- In `amendCommitsInRange()`, add `logger` parameter and log at each of the 4 silent exit points: no epic issue in sync refs, no range start, git log failure, empty commit list
- In `resolveRangeStart()`, add diagnostic logging for tag resolution attempts and merge-base fallback
- In the runner (step 8.5), log the amend result even when `amended === 0` — currently only logs on success
- Forward-only fix: no store migration, no backfill of existing GitHub issues
- `EpicBodyInput` interface may need the `phase` field removed or made optional since it's no longer rendered

## Testing Decisions

- Update `body-format.test.ts` to verify phase badge is absent from formatted epic bodies
- Update early-issues tests (if any) to verify stub body has no phase badge
- Existing `commit-issue-ref.test.ts` has good coverage for amend logic — extend with tests for the diagnostic logging paths
- Manual verification: run a full phase cycle with `github.enabled: true` and confirm issue bodies are clean, artifact links are clickable, and commits have `(#N)` refs

## Out of Scope

- Backfilling existing GitHub issues with corrected bodies
- Migrating stale store artifact paths
- Changing the rebase-based amend mechanism to a different approach
- Feature issue body changes (no phase badge exists there currently)

## Further Notes

The commit-issue-ref amend has 4 silent no-op exit points that all return `{ amended: 0, skipped: 0 }`. The runner only logs when `amended > 0`, creating a perfect observability black hole. The actual root cause may be one of: (a) epic not in sync refs because GitHub sync failed earlier, (b) `resolveRangeStart` returning undefined because worktree has no merge-base with main, (c) the rebase `--exec` shell script failing silently. Adding logging will surface which one.

## Deferred Ideas

None
