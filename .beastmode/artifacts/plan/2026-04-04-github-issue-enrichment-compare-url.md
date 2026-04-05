---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: compare-url
wave: 3
---

# Compare URL

**Design:** .beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md

## User Stories

4. As a developer, I want the epic issue body to contain a compare URL (`main...feature/slug`), so that I can view the full diff in one click.
5. As a developer, I want the compare URL to switch to an archive tag range after release (`vX.Y.Z...archive/feature/slug`), so that closed epics retain working diff links.

## What to Build

Add compare URL generation to the epic body formatting pipeline. Two variants based on epic lifecycle state:

**Active development variant.** When the epic is in any phase before "done", generate a compare URL of the form `https://github.com/{owner}/{repo}/compare/main...{branch}`. The branch comes from `manifest.worktree.branch`. The repo owner/name comes from `manifest.github.repo` (already resolved by discovery).

**Post-release variant.** When the epic phase is "done" (after release), the feature branch is deleted. The compare URL must switch to tag-based references: `https://github.com/{owner}/{repo}/compare/{previous-version-tag}...archive/feature/{slug}`. The version tag comes from the release artifact. The archive tag is created by the existing release worktree cleanup step.

The compare URL should appear in the git metadata section of the epic body, which `formatEpicBody()` already renders. The `resolveGitMetadata()` function (or its inputs) need to include the compare URL.

The sync engine's body hash comparison ensures the issue body is only updated when the URL changes (e.g., at release time when the URL switches from branch-based to tag-based).

## Acceptance Criteria

- [ ] Active epic body contains a compare URL in the format `main...{branch}`
- [ ] Released epic body contains a compare URL in the format `{version-tag}...archive/feature/{slug}`
- [ ] Compare URL appears in the git metadata section of the epic body
- [ ] Compare URL is a clickable markdown link
- [ ] Body hash changes when compare URL switches from active to archive form
- [ ] Unit tests verify both URL variants
- [ ] Epic bodies without a worktree branch omit the compare URL (no broken links)
