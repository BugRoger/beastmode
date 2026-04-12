---
phase: plan
epic-id: bm-c861
epic-slug: github-sync-bug-fixes-c861
feature-name: Fix Artifact Links
wave: 2
---

# Fix Artifact Links

**Design:** .beastmode/artifacts/design/2026-04-12-github-sync-bug-fixes-c861.md

## User Stories

2. As a user viewing an epic issue on GitHub, I want artifact links to be clickable GitHub permalinks (or at minimum repo-relative paths), so that I can navigate to the artifact directly.

## What to Build

The artifact link table in epic issue bodies renders local filesystem paths instead of GitHub permalinks. The normalization function that builds the artifact map already extracts basenames and prepends the correct repo-relative prefix, but the paths entering it may contain absolute or worktree-relative prefixes that survive the `basename()` extraction.

**Artifact map builder:**

Verify the normalization logic handles all path shapes that the store can produce:
- Absolute paths (e.g., `/Users/.../beastmode/artifacts/design/file.md`)
- Worktree-relative paths (e.g., `.claude/worktrees/<slug>/.beastmode/artifacts/design/file.md`)
- Already-correct repo-relative paths (e.g., `.beastmode/artifacts/design/file.md`)
- Bare filenames (e.g., `file.md`)

The current implementation uses `basename(rawPath)` which should handle all of these correctly — the basename of any path shape is just the filename. Verify this is true and add test coverage for edge cases if missing.

**Artifact link resolver:**

The existing tag-based permalink strategy is correct: look up `refs/tags/beastmode/<slug>/<phase>`, if it resolves to a SHA, construct `https://github.com/<repo>/blob/<sha>/<repoPath>`. The `repoPath` fed in comes from the artifact map builder's normalized output.

Verify the full pipeline: store path -> `buildArtifactsMap` normalization -> `resolveArtifactLinks` permalink construction -> `formatEpicBody` table rendering. Ensure the repo-relative path appears correctly in both the permalink URL and the fallback plain text.

Add or extend test coverage for the path normalization pipeline, particularly for worktree-relative and absolute input paths.

## Integration Test Scenarios

<!-- No behavioral scenarios -- skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] `buildArtifactsMap` normalizes absolute paths to repo-relative format
- [ ] `buildArtifactsMap` normalizes worktree-relative paths to repo-relative format
- [ ] `resolveArtifactLinks` constructs valid GitHub permalink URLs from normalized paths
- [ ] Fallback (no tag) renders clean repo-relative path, not absolute filesystem path
- [ ] Existing path normalization tests pass
- [ ] New edge case tests cover absolute and worktree-relative input paths
