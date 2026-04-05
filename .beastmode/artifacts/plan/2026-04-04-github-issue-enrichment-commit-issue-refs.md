---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: commit-issue-refs
wave: 4
---

# Commit Issue Refs

**Design:** .beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md

## User Stories

3. As a developer, I want commits to reference the epic or feature issue number (e.g., `design(epic): checkpoint (#42)`), so that GitHub auto-links commits in the issue timeline.

## What to Build

A new pipeline runner step that amends the most recent commit to append an issue number reference. This runs post-checkpoint, pre-sync — after the skill has committed its work but before GitHub sync runs.

**Three commit types get refs:**

1. **Phase checkpoint commits** on the feature branch get the epic issue ref. The manifest's `github.epic` field provides the issue number. Format: `design(epic): checkpoint (#42)`.

2. **Implementation task commits** on `impl/` branches get the feature issue ref. The CLI parses the impl branch name (`impl/<slug>--<feature>`) to extract the feature slug, then looks up `feature.github.issue` in the manifest. Format: `implement(feature-slug): task description (#57)`.

3. **Release squash-merge commits** on main get the epic issue ref. Same source as phase checkpoints. Format: `Release vX.Y.Z — Feature Name (#42)`.

**Amend mechanics.** The step reads the most recent commit message via `git log -1 --format=%s`. If the message already contains a `(#N)` suffix, skip (idempotent). Otherwise, amend the commit: `git commit --amend -m "{original message} (#{issue_number})"`.

**No-op when no issue number.** If the manifest has no GitHub issue number for the relevant entity (epic or feature), the step is a no-op. No error, no warning — the commit stays as-is.

**Branch detection.** The step determines the commit type by inspecting the current branch name. Feature branches (`feature/<slug>`) → phase checkpoint. Impl branches (`impl/<slug>--<feature>`) → implementation task. Main branch → release.

## Acceptance Criteria

- [ ] Phase checkpoint commits on feature branches include `(#N)` with the epic issue number
- [ ] Implementation task commits on impl branches include `(#N)` with the feature issue number
- [ ] Release squash-merge commits include `(#N)` with the epic issue number
- [ ] Feature issue number is resolved by parsing the impl branch name and looking up the manifest
- [ ] Commit amend is idempotent — already-referenced commits are not double-amended
- [ ] No-op when manifest has no issue number (no error, no warning)
- [ ] Unit tests for message rewriting with all three commit types
- [ ] Unit tests for the no-issue-number passthrough case
- [ ] Unit tests for the already-has-reference idempotency case
