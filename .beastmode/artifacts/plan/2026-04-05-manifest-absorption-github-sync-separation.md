---
phase: plan
slug: 1f6b
epic: manifest-absorption
feature: github-sync-separation
wave: 2
---

# GitHub Sync Separation

**Design:** `.beastmode/artifacts/design/2026-04-04-1f6b.md`

## User Stories

1. As a **GitHub sync module**, I want to read epic/feature pipeline state from the store and GitHub refs from a separate sync file, so that pipeline state and sync state have clear ownership boundaries.

## What to Build

Extract GitHub issue tracking into a dedicated sync file and rewrite the sync module to consume store entities:

- **GitHub sync file**: Create `.beastmode/state/github-sync.json` with schema `Record<entityId, { issue: number; bodyHash?: string }>`. The GitHub sync module is the sole reader/writer. This file is gitignored (lives in `state/`).

- **Sync file I/O module**: Create a focused module for reading/writing `github-sync.json`. Operations: `loadSyncRefs(projectRoot)`, `saveSyncRefs(projectRoot, refs)`, `getSyncRef(refs, entityId)`, `setSyncRef(refs, entityId, ref)`. Keep it minimal — no business logic.

- **Rewrite sync.ts**: The main sync module (`github/sync.ts`) currently reads `manifest.github` for issue numbers and `manifest.features[].github` for feature issues. Rewrite to:
  - Read pipeline state (phase, features, artifacts, summary) from store entities
  - Read GitHub refs (issue numbers, body hashes) from `github-sync.json`
  - Return mutations that the caller applies to the sync file (not to store entities)
  - The `syncGitHub()` function signature changes: accepts store Epic + features + sync refs instead of PipelineManifest

- **Rewrite early-issues.ts**: The pre-dispatch issue creation module currently writes issue numbers back to the manifest. Rewrite to:
  - Read epic/feature identity from store entities
  - Read/write issue numbers to `github-sync.json`
  - No manifest reads or writes

- **Rewrite commit-issue-ref.ts**: Currently reads manifest to get issue numbers. Rewrite to:
  - Read issue numbers from `github-sync.json`
  - Read epic/feature identity from store (for branch→entity resolution)

- **Delete GitHub fields from pure.ts callers**: The functions `setGitHubEpic`, `setFeatureGitHubIssue`, `setEpicBodyHash`, `setFeatureBodyHash` from `manifest/pure.ts` are no longer called — GitHub state lives in the sync file, not on pipeline entities.

- **Runner step 8 rewrite**: Update the GitHub mirror step in `pipeline/runner.ts` to read from store + sync file instead of manifest.

- **Body formatting**: Update `formatEpicBody()` and related functions to accept store Epic type input instead of manifest-derived input.

## Integration Test Scenarios

```gherkin
@manifest-absorption
Feature: GitHub sync state separated from pipeline state

  GitHub issue numbers and body hashes are stored in a dedicated
  sync file, not on store entities. The GitHub sync module reads
  pipeline state from the store and sync refs from its own file.
  Pipeline state and sync state have clear ownership boundaries.

  Background:
    Given a store is initialized
    And an epic "auth-system" exists in the store

  Scenario: GitHub issue number stored in sync file, not on store entity
    When a GitHub issue is created for epic "auth-system"
    Then the issue number is recorded in the sync file
    And the epic entity in the store does not carry the issue number

  Scenario: GitHub sync module reads pipeline state from store
    Given epic "auth-system" is at phase "plan" in the store
    When the GitHub sync module enriches the epic issue body
    Then it reads the phase from the store entity
    And it reads the issue number from the sync file

  Scenario: Feature issue numbers stored in sync file
    Given a feature "login-flow" exists under "auth-system"
    When a GitHub issue is created for feature "login-flow"
    Then the feature issue number is recorded in the sync file
    And the feature entity in the store does not carry the issue number

  Scenario: Sync file is independent from store transactions
    Given epic "auth-system" has a GitHub issue recorded in the sync file
    When the epic status is updated in the store
    Then the sync file is not modified by the store transaction
    And the sync file retains the existing issue reference

  Scenario: Body hash tracked in sync file for idempotent updates
    Given epic "auth-system" has a GitHub issue with an enriched body
    When the sync module checks whether the body needs updating
    Then it compares the current body hash from the sync file
    And it skips the update if the hash matches
```

## Acceptance Criteria

- [ ] `github-sync.json` created with `Record<entityId, { issue: number; bodyHash?: string }>` schema
- [ ] Sync file I/O module with load/save/get/set operations
- [ ] `sync.ts` reads pipeline state from store, GitHub refs from sync file
- [ ] `early-issues.ts` reads/writes issue numbers to sync file
- [ ] `commit-issue-ref.ts` reads issue numbers from sync file
- [ ] `setGitHubEpic`, `setFeatureGitHubIssue`, `setEpicBodyHash`, `setFeatureBodyHash` no longer called
- [ ] Runner step 8 uses store + sync file
- [ ] Body formatting functions accept store Epic type input
- [ ] GitHub sync tests updated to use store entities + sync file
- [ ] No GitHub-related fields remain on store Entity types
