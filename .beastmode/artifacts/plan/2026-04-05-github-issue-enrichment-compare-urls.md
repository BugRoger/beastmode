---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: compare-urls
wave: 3
---

# Compare URLs

**Design:** `.beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md`

## User Stories

4. As a developer, I want the epic issue body to contain a compare URL (`main...feature/slug`), so that I can view the full diff in one click.
5. As a developer, I want the compare URL to switch to an archive tag range after release (`vX.Y.Z...archive/feature/slug`), so that closed epics retain working diff links.

## What to Build

Add compare URL generation to the epic issue body, placed in the git metadata section of `formatEpicBody()`.

**Active development URL:** During active development (phase is not `done`), generate `https://github.com/{owner}/{repo}/compare/main...{branch}` where `{branch}` is the epic's worktree branch (`feature/{slug}`). The repo owner and name come from the manifest's `github.repo` field or the discovery cache.

**Post-release archive URL:** After release (phase is `done`), the feature branch is deleted. The URL switches to `https://github.com/{owner}/{repo}/compare/{previous-version-tag}...archive/feature/{slug}` using the archive tag created during the release workflow. The previous version tag comes from the release metadata.

**Fallback:** If no archive tag exists (edge case — release without archiving), fall back to the branch-based URL. This prevents broken links even if the archiving step was skipped.

The compare URL is a pure computation — `formatEpicBody()` receives the necessary inputs (repo, branch, phase, tags) and renders the appropriate URL. No I/O in the formatter. The input type may need additional fields for release metadata (version tag, archive tag presence).

## Acceptance Criteria

- [ ] Active epic body contains compare URL `main...feature/{slug}`
- [ ] Compare URL appears in the git metadata section of the epic body
- [ ] Compare URL is a clickable markdown link
- [ ] Released epic body uses archive tag range `{version-tag}...archive/feature/{slug}`
- [ ] Fallback to branch-based URL when no archive tag exists
- [ ] Unit tests for both active and post-release URL generation
