---
phase: plan
slug: github-sync-polish
epic: github-sync-polish
feature: git-push
wave: 1
---

# Git Push

**Design:** `.beastmode/artifacts/design/2026-04-05-github-sync-polish.md`

## User Stories

5. As a developer, I want feature branches and impl branches pushed upstream after each phase checkpoint, so that in-progress work is visible on GitHub and backed up.
6. As a developer, I want all phase tags and archive tags pushed upstream, so that artifact permalinks and compare URLs resolve on GitHub.

## What to Build

### Branch Push Step

Add a new pipeline runner step that pushes branches after each phase checkpoint. This is a pure git operation (`git push origin <branch>`) — it always runs when a remote exists, not gated on `github.enabled`. Feature branches are pushed on every phase. Impl branches are pushed during the implement phase.

The step runs after manifest reconciliation and GitHub mirror sync (so issue numbers exist), but as a git operation it does not depend on GitHub sync success.

### Tag Push Step

Add a step that pushes all tags after each phase checkpoint. Uses `git push origin --tags` to push phase tags (`beastmode/<slug>/<phase>`) and archive tags (`archive/<slug>`). Same positioning as branch push — after manifest update. Also a pure git operation, not gated on `github.enabled`.

### Error Handling

Both push operations use warn-and-continue. If the remote is unreachable or the push fails, log a warning and continue. The phase checkpoint succeeds locally regardless. This matches the existing sync engine's error philosophy.

### Remote Detection

Check for a configured remote before attempting push. If no remote exists (pure local workflow), skip silently. Use existing git utility functions to detect remote availability.

## Integration Test Scenarios

```gherkin
@github-sync-polish
Feature: Branches and tags pushed upstream after checkpoints

  Feature branches and impl branches are pushed to the remote after
  each phase checkpoint. Phase tags and archive tags are also pushed
  so that artifact permalinks and compare URLs resolve on GitHub.

  Background:
    Given a remote repository is configured

  Scenario: Feature branch pushed after design phase checkpoint
    Given an epic has completed the design phase with local commits
    When the phase checkpoint completes
    Then the feature branch is pushed to the remote

  Scenario: Impl branch pushed after implement phase checkpoint
    Given a feature has an impl branch with local commits
    When the implement phase checkpoint completes
    Then the impl branch is pushed to the remote

  Scenario: Feature branch pushed after each successive phase
    Given an epic has already pushed the feature branch after design
    When the plan phase checkpoint completes
    Then the feature branch is pushed to the remote with the new commits

  Scenario: Phase tags pushed after checkpoint
    Given a phase checkpoint creates a local phase tag
    When the checkpoint push operation runs
    Then the phase tag is available on the remote

  Scenario: Archive tags pushed during release
    Given a release operation creates a local archive tag
    When the release push operation runs
    Then the archive tag is available on the remote

  Scenario: Push failure does not block the phase checkpoint
    Given the remote is temporarily unreachable
    When a phase checkpoint completes
    Then the checkpoint succeeds locally
    And the push failure is logged as a warning
```

## Acceptance Criteria

- [ ] Feature branches pushed to remote after every phase checkpoint
- [ ] Impl branches pushed to remote during implement phase
- [ ] Phase tags (`beastmode/<slug>/<phase>`) pushed after each checkpoint
- [ ] Archive tags (`archive/<slug>`) pushed during release
- [ ] Push operations are not gated on `github.enabled` — pure git ops
- [ ] Push failures warn and continue, never block the pipeline
- [ ] No push attempted when no remote is configured
- [ ] Unit tests for push step logic
