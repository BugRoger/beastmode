---
phase: plan
slug: github-sync-polish
epic: github-sync-polish
feature: commit-traceability
wave: 2
---

# Commit Traceability

**Design:** `.beastmode/artifacts/design/2026-04-05-github-sync-polish.md`

## User Stories

7. As a developer, I want every commit on a feature branch to contain an issue reference (#N), so that commits appear in the GitHub issue timeline and provide code-to-issue traceability.

## What to Build

### Range-Based Commit Amend

Extend the existing commit-issue-ref module from single-commit (HEAD) amendment to range-based rebase. After phase dispatch and before the push step, rebase all commits since the last phase tag to inject `(#N)` issue references into commit messages.

The rebase operates on the range from the previous phase tag (`beastmode/<slug>/<previous-phase>`) to HEAD. For commits on the feature branch, the epic issue number is used. For commits on impl branches (detected by commit message prefix convention or branch name), the feature issue number is used. Commits that already contain a `(#N)` reference are skipped.

### Ordering

The amend step runs in the pipeline after phase dispatch and manifest reconciliation (so issue numbers are known) but before the push step (so no force-push is needed). Since commits haven't been pushed at amend time, the rebase rewrites local-only history.

### Edge Cases

- First phase (design) has no previous phase tag — use the branch point from main as the range start.
- Commits with multiple parents (merge commits) should be skipped or handled carefully during rebase.
- Empty rebases (all commits already have refs) should no-op gracefully.

## Integration Test Scenarios

<!-- No behavioral scenarios produced for this feature — existing commit-issue-refs.feature provides full coverage for the single-commit case. The range-based extension is a mechanical expansion of the same logic. Unit tests cover the new rebase range behavior. -->

## Acceptance Criteria

- [ ] All commits since the last phase tag have `(#N)` issue references after the amend step
- [ ] Epic issue ref used for phase checkpoint commits on feature branch
- [ ] Feature issue ref used for impl task commits (detected by commit message prefix)
- [ ] Commits with existing `(#N)` references are skipped (no duplication)
- [ ] Amend step runs before push — no force-push required
- [ ] First phase uses branch point from main as range start
- [ ] Empty rebase (all commits already amended) is a clean no-op
- [ ] Unit tests for range detection and issue number routing
