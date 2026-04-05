---
phase: plan
slug: github-sync-polish
epic: github-sync-polish
feature: branch-linking
wave: 2
---

# Branch Linking

**Design:** `.beastmode/artifacts/design/2026-04-05-github-sync-polish.md`

## User Stories

8. As a developer, I want feature branches linked to epic issues and impl branches linked to feature issues via the GitHub API, so that the Development sidebar shows associated branches.

## What to Build

### createLinkedBranch GraphQL Wrapper

Add a new function to the GitHub CLI module that calls the `createLinkedBranch` GraphQL mutation. This mutation creates a remote branch AND links it to a GitHub issue in one step. Since branches are already pushed by the git-push feature, the workaround is: delete the remote ref first, then call `createLinkedBranch` to recreate at the same SHA — this establishes the link.

The wrapper needs the repository ID (GraphQL node ID, not "owner/repo"), the issue ID (GraphQL node ID), the branch name, and the OID (commit SHA). Use the existing `ghGraphQL()` helper for execution.

### Branch Link Step in Pipeline

Add a new pipeline runner step that runs after the push step. For each pushed branch:
- Feature branches → link to the epic issue
- Impl branches → link to the corresponding feature issue

This step is gated on `github.enabled` (unlike push, which is pure git). Uses warn-and-continue — linking failures never block the pipeline.

### GraphQL ID Resolution

The `createLinkedBranch` mutation requires GraphQL node IDs (not REST API numbers). Add a helper to resolve:
- Repository node ID from "owner/repo"
- Issue node ID from issue number

These can be cached in the resolved GitHub metadata alongside existing project/field IDs.

### Idempotency

If `createLinkedBranch` returns `linkedBranch: null` (branch already exists on remote), use the delete-then-recreate flow. If the branch doesn't exist on remote at all, `createLinkedBranch` creates it directly. Skip linking for issues without a known issue number in the manifest.

## Integration Test Scenarios

```gherkin
@github-sync-polish
Feature: Branches linked to issues via GitHub Development sidebar

  Feature branches are linked to their epic issue and impl branches
  are linked to their feature issue through the GitHub API. This makes
  associated branches visible in the Development sidebar of each issue.

  Scenario: Feature branch linked to epic issue
    Given an epic has a GitHub issue and a feature branch
    When the branch linking operation runs
    Then the feature branch appears in the epic issue's Development sidebar

  Scenario: Impl branch linked to feature issue
    Given a feature has a GitHub issue and an impl branch
    When the branch linking operation runs
    Then the impl branch appears in the feature issue's Development sidebar

  Scenario: Branch linking is idempotent
    Given a feature branch is already linked to its epic issue
    When the branch linking operation runs again
    Then no duplicate link is created
    And the existing link is preserved

  Scenario: Branch linking skips issues without a known issue number
    Given an epic has no GitHub issue number in its manifest
    When the branch linking operation runs
    Then the epic is skipped without error
```

## Acceptance Criteria

- [ ] Feature branches linked to epic issues via `createLinkedBranch` GraphQL mutation
- [ ] Impl branches linked to feature issues via the same mutation
- [ ] Delete-then-recreate workaround handles already-existing remote branches
- [ ] Branch linking is gated on `github.enabled`
- [ ] Linking failures warn and continue, never block the pipeline
- [ ] Epics/features without GitHub issue numbers are skipped silently
- [ ] GraphQL node IDs resolved for repository and issues
- [ ] Unit tests for the GraphQL wrapper and linking logic
