---
phase: plan
slug: github-issue-enrichment-3d61b1
epic: github-issue-enrichment
feature: body-enrichment
wave: 1
---

# Body Enrichment

**Design:** `.beastmode/artifacts/design/2026-04-03-github-issue-enrichment-3d61b1.md`

## User Stories

1. As a developer browsing GitHub issues, I want epic bodies to include PRD summary, user stories, and implementation decisions, so that I can understand the feature without leaving GitHub.
2. As a developer browsing GitHub issues, I want feature bodies to include their user story from the plan, so that I know what each feature implements.
3. As a developer, I want epic issues to link to the full PRD (repo-relative path and GitHub permalink), so that I can access the complete design document.
6. As a developer, I want the epic body to be updated at each phase transition with newly available information, so that the issue always reflects the current state of the feature.

## What to Build

**Extend body-format interfaces.** Add optional fields to `EpicBodyInput`: `prdSections` (an object with optional `problem`, `solution`, `userStories`, `decisions` string fields), `artifactLinks` (a record of phase names to objects containing repo-relative path and optional permalink URL). Add an optional `userStory` string field to `FeatureBodyInput`.

**Update body-format rendering.** The epic body renderer gains new sections rendered via presence-based logic: if `prdSections.problem` is present, render a `## Problem` section; same for solution, user stories, and decisions. If `artifactLinks` is present, render an `## Artifacts` section with a table or list linking to each phase artifact (repo path as display text, permalink as clickable link when available). The existing phase badge, summary, and feature checklist remain unchanged. New sections appear after the existing summary and before the feature checklist.

The feature body renderer gains a `## User Story` section rendered when `userStory` is present, placed before the existing epic back-reference.

All new sections are purely additive — if the optional field is absent, the section is not rendered at all (no empty headings, no placeholder text).

**Wire github-sync to read artifacts.** In the sync orchestration, before calling `formatEpicBody`, the sync function reads the design artifact (PRD) using the section extractor to pull problem, solution, user stories, and decisions sections. It resolves artifact links from the manifest's `artifacts` record, building repo-relative paths and permalink URLs using phase tag SHAs (`beastmode/{slug}/{phase}`) as commit anchors. For feature bodies, it reads the feature's plan artifact (path from `manifest.features[n].plan`) to extract the `## User Stories` section.

Artifact path discovery: use `manifest.artifacts` first, fall back to globbing `artifacts/{phase}/` by slug, degrade to current minimal body if neither works.

Permalink construction: for each phase artifact, check if the corresponding phase tag exists (`beastmode/{slug}/{phase}`). If it does, construct a GitHub permalink using the tag SHA as the commit reference. If not, use the repo-relative path without a permalink.

**Progressive enrichment.** The body gets richer as phases advance. After design: PRD sections appear. After plan: plan artifact link added, feature issues get user stories. The existing `bodyHash` mechanism prevents redundant API calls — only issues whose rendered body actually changed get updated.

## Acceptance Criteria

- [ ] `EpicBodyInput` extended with optional `prdSections` and `artifactLinks` fields
- [ ] `FeatureBodyInput` extended with optional `userStory` field
- [ ] Epic body renders PRD problem, solution, user stories, and decisions sections when present
- [ ] Epic body renders artifact links section with repo paths and permalinks when present
- [ ] Feature body renders user story section when present
- [ ] Missing optional fields produce no output (no empty sections)
- [ ] `github-sync.ts` reads PRD sections via section extractor before calling body formatter
- [ ] `github-sync.ts` reads feature user stories from plan artifact before calling feature body formatter
- [ ] `github-sync.ts` resolves artifact links and permalink URLs from manifest and git tags
- [ ] Graceful degradation: missing artifacts, missing tags, or missing sections all result in omitted body sections, never errors
- [ ] Unit tests for body-format: new sections render correctly, missing fields produce no output
- [ ] Integration tests for github-sync: enriched bodies passed to formatter, degradation on missing artifacts
