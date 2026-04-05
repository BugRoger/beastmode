---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: commit-issue-refs
wave: 4
---

# Commit Issue References

**Design:** `.beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md`

## User Stories

3. As a developer, I want commits to reference the epic or feature issue number (e.g., `design(epic): checkpoint (#42)`), so that GitHub auto-links commits in the issue timeline.

## What to Build

Add a post-checkpoint, pre-sync step in the pipeline runner that amends the most recent commit message to append an issue reference. This creates the link between code history and the GitHub issues that motivated the changes.

**Commit message format:** Trailing parenthetical on the subject line — `design(epic): checkpoint (#42)`. The `(#N)` is appended to the existing subject line.

**Three commit types get refs:**

1. **Phase checkpoint commits** (on `feature/{slug}` branch): Reference the epic issue number from `manifest.github.epic`.
2. **Implementation task commits** (on `impl/{slug}--{feature}` branch): Reference the feature issue number. The CLI parses the impl branch name to identify the feature slug, then looks up the feature's issue number in the manifest.
3. **Release squash-merge commits** (on `main`): Reference the epic issue number.

**Resolution logic:** Read the current branch name. If on an `impl/` branch, parse the feature slug from the branch name pattern `impl/{slug}--{feature}` and look up the feature's issue number in the manifest. Otherwise, use the epic issue number.

**No-op behavior:** If no issue number is available (manifest doesn't have one yet, or lookup fails), skip the amend. No error, no warning — the commit just doesn't get a ref.

**Git operation:** `git commit --amend -m "{original subject} (#{issue_number})"` — only modifies the subject line of the most recent commit. This is a safe operation in the worktree context since these commits haven't been pushed.

## Acceptance Criteria

- [ ] Phase checkpoint commits amended with epic issue reference `(#N)`
- [ ] Impl branch commits amended with feature issue reference `(#N)`
- [ ] Release squash-merge commits amended with epic issue reference `(#N)`
- [ ] Feature slug correctly parsed from `impl/{slug}--{feature}` branch name
- [ ] No-op when issue number is unavailable — commit left unchanged
- [ ] Amend step runs post-checkpoint but before GitHub sync
- [ ] Unit tests for commit message rewriting with all three commit types
- [ ] Unit tests for branch name parsing and issue number resolution
