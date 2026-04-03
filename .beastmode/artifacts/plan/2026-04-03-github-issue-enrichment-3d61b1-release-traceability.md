---
phase: plan
slug: github-issue-enrichment-3d61b1
epic: github-issue-enrichment
feature: release-traceability
wave: 2
---

# Release Traceability

**Design:** `.beastmode/artifacts/design/2026-04-03-github-issue-enrichment-3d61b1.md`

## User Stories

4. As a developer, I want epic issues to show branch name, phase tags, release version, and merge commit link, so that I can trace code changes back to the feature.
5. As a developer, I want a closing comment on released epics with version number, release tag, and merge commit, so that release history is discoverable from the issue timeline.

## What to Build

**Extend body-format with git metadata.** Add an optional `gitMetadata` field to `EpicBodyInput` containing: `branch` (string), `phaseTags` (record of phase name to tag name), `version` (string), and `mergeCommit` (string — full SHA). All sub-fields are optional within `gitMetadata`.

**Render git traceability section.** When `gitMetadata` is present, the epic body renderer adds a `## Git` section after artifacts and before the feature checklist. It renders: branch name, a list of phase tags (linking to the tag on GitHub), version number, and merge commit (as a short-SHA link to the commit on GitHub). Each sub-field is rendered only if present — progressive enrichment means branch appears early, version and merge commit appear only at release.

**Closing comment on release.** Add a new function to body-format that generates a release closing comment. It takes version, release tag name, and merge commit SHA, and returns a markdown comment body announcing the release. The comment includes: version number, link to the release tag, and link to the merge commit.

**Wire release metadata in github-sync.** During sync, when the phase is `done` (post-release), the sync function reads git metadata: branch from manifest, phase tags via `git tag -l 'beastmode/{slug}/*'`, version from `plugin.json` or manifest, merge commit SHA from git. It passes this as `gitMetadata` to `formatEpicBody`. Additionally, it calls a new function to post the closing comment on the epic issue. The closing comment is posted exactly once — tracked by a flag or presence check to avoid duplicate comments on re-sync.

**Permalink construction for tags.** Phase tag links use the format `https://github.com/{owner}/{repo}/tree/{tag}`. Merge commit links use `https://github.com/{owner}/{repo}/commit/{sha}`.

## Acceptance Criteria

- [ ] `EpicBodyInput` extended with optional `gitMetadata` field (branch, phaseTags, version, mergeCommit)
- [ ] Epic body renders Git section with branch, phase tags, version, and merge commit when present
- [ ] Phase tags rendered as links to the tag on GitHub
- [ ] Merge commit rendered as short-SHA link to the commit on GitHub
- [ ] Missing git metadata sub-fields produce no output for that line
- [ ] Closing comment function generates release announcement markdown
- [ ] `github-sync.ts` reads git metadata (branch, tags, version, merge commit) and passes to body formatter
- [ ] `github-sync.ts` posts closing comment on epic issue when phase transitions to done
- [ ] Closing comment posted exactly once — no duplicates on re-sync
- [ ] Unit tests for body-format: git section rendering, closing comment generation
- [ ] Integration tests for github-sync: git metadata passed to formatter, closing comment posted, no duplicate comments
