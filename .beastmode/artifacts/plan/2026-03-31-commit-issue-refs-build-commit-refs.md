---
phase: plan
epic: commit-issue-refs
feature: build-commit-refs
---

# Build Commit Refs

**Design:** `.beastmode/artifacts/design/2026-03-31-commit-issue-refs.md`

## User Stories

1. As a developer reviewing history, I want checkpoint commits to reference their GitHub issue, so that I can trace commits to the epic they belong to.
2. As a developer viewing a GitHub issue, I want to see linked commits in the issue timeline, so that I can follow implementation progress without leaving GitHub.
3. As a pipeline operator, I want commit-issue linking to work automatically without manual intervention, so that the documentation trail is always complete.

## What to Build

A `buildCommitRefs(manifest, featureSlug?)` utility function in the CLI that constructs a `<commit-refs>` block from the manifest's github field. The function returns a multi-line string containing `Refs #N` lines — always including the epic ref when `manifest.github` exists, and adding the feature ref when `featureSlug` is provided and that feature has a `github.issue` field.

The SDK runner's prompt construction must be updated to call `buildCommitRefs()` and append the resulting block (if non-empty) to the prompt string before dispatching to the Claude Agent SDK. For implement fan-out dispatches, the feature slug is passed so each per-feature dispatch gets both epic and feature refs. For release, only the epic ref is included.

When the manifest has no `github` field, the function returns an empty string and the prompt is unchanged — a graceful no-op.

## Acceptance Criteria

- [ ] `buildCommitRefs()` returns `<commit-refs>\nRefs #N\n</commit-refs>` for epic-only case
- [ ] `buildCommitRefs()` returns block with both epic and feature refs when feature has github.issue
- [ ] `buildCommitRefs()` returns empty string when manifest has no github field
- [ ] SDK runner appends `<commit-refs>` block to prompt when manifest has github field
- [ ] SDK runner prompt is unchanged when manifest lacks github field
- [ ] Implement fan-out passes feature slug to `buildCommitRefs()`
- [ ] Unit tests cover all three cases: epic-only, epic+feature, no-github-field
