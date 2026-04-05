---
phase: plan
slug: github-sync-polish
epic: github-sync-polish
feature: backfill
wave: 3
---

# Backfill

**Design:** `.beastmode/artifacts/design/2026-04-05-github-sync-polish.md`

## User Stories

9. As a project operator, I want a one-time backfill script that reconciles all existing epics — fixing titles, filling bodies, pushing branches and tags, amending commits, and linking branches — so that the entire repository history is consistent.

## What to Build

### Throwaway Script

A standalone script (not a permanent CLI command) that iterates all manifest files and reconciles each epic against the new standards. The script is idempotent — safe to re-run without side effects on already-reconciled epics.

### Reconciliation Steps Per Epic

For each manifest found in `.beastmode/state/`:

1. **Title fix** — If the epic issue title doesn't match `manifest.epic`, update it. If feature issue titles don't follow `{epic}: {feature}`, update them.

2. **Body enrichment** — If the epic issue body is missing PRD sections, re-render using the updated `formatEpicBody()` with design artifact content. If feature issue bodies are missing plan sections, re-render using the updated `formatFeatureBody()` with plan artifact content.

3. **Branch push** — Push any local feature branches and impl branches that aren't on the remote yet.

4. **Tag push** — Push any local phase tags and archive tags that aren't on the remote yet.

5. **Commit amend** — For commits without issue references, run the range-based rebase to inject `(#N)` refs. This is the one operation that may require `--force-push` since historical commits may already be pushed. The backfill script is the only place force-push is permitted.

6. **Branch linking** — For branches not yet linked to their issues, call `createLinkedBranch` to establish the link.

### Skip Conditions

- Epics without `manifest.github.epic` (no GitHub issue) are skipped entirely.
- Individual steps skip when already reconciled (title matches, body hash matches, branch exists on remote, commits already have refs, branch already linked).

### Error Handling

Warn-and-continue per epic. If one epic fails, log the error and proceed to the next. Print a summary at the end showing which epics were updated, skipped, or errored.

## Integration Test Scenarios

```gherkin
@github-sync-polish
Feature: Backfill reconciles all existing epics to current standards

  A one-time backfill operation iterates all existing epics and reconciles
  them: fixing titles to human-readable names, filling issue bodies with
  enriched content, pushing branches and tags, amending commits with issue
  references, and linking branches to issues.

  Scenario: Backfill updates epic issue titles to human-readable names
    Given an existing epic has a GitHub issue titled with a hex slug
    And the epic has a human-readable name in its manifest
    When the backfill operation runs
    Then the epic issue title is updated to the human-readable name

  Scenario: Backfill updates feature issue titles with epic name prefix
    Given an existing feature has a GitHub issue without an epic name prefix
    When the backfill operation runs
    Then the feature issue title is updated with the epic name prefix

  Scenario: Backfill enriches a bare epic issue with PRD content
    Given an existing epic has a bare GitHub issue with no PRD content
    And the epic has a design artifact with PRD sections
    When the backfill operation runs
    Then the epic issue body is updated with the full PRD content

  Scenario: Backfill enriches feature issues with full plan content
    Given an existing epic has feature issues with empty bodies
    And the epic has a plan artifact with feature descriptions
    When the backfill operation runs
    Then each feature issue body is updated with its full plan content

  Scenario: Backfill pushes unpushed feature branches
    Given an existing epic has a local feature branch not yet pushed
    When the backfill operation runs
    Then the feature branch is pushed to the remote

  Scenario: Backfill pushes unpushed tags
    Given an existing epic has local phase tags and archive tags not yet pushed
    When the backfill operation runs
    Then all phase tags and archive tags are pushed to the remote

  Scenario: Backfill amends commits with issue references
    Given an existing epic has commits without issue references
    And the epic has a known issue number
    When the backfill operation runs
    Then the commit messages are amended to include the issue reference

  Scenario: Backfill links branches to issues
    Given an existing epic has a feature branch not linked to its issue
    When the backfill operation runs
    Then the feature branch is linked to the epic issue via the GitHub API

  Scenario: Backfill skips epics without GitHub issues
    Given an existing epic has no GitHub issue number in its manifest
    When the backfill operation runs
    Then the epic is skipped without error

  Scenario: Backfill is idempotent on already-reconciled epics
    Given an existing epic has already been fully reconciled
    When the backfill operation runs
    Then the epic's issues, branches, tags, and commits remain unchanged
    And no duplicate operations are performed

  Scenario: Backfill processes released epics with archive tag URLs
    Given an existing released epic has a bare GitHub issue
    And the epic has an archive tag and version tag
    When the backfill operation runs
    Then the epic issue body uses the archive tag compare URL
```

## Acceptance Criteria

- [ ] Script iterates all manifests in `.beastmode/state/`
- [ ] Epic issue titles updated to human-readable names
- [ ] Feature issue titles updated with `{epic}: {feature}` format
- [ ] Epic issue bodies enriched with full PRD content
- [ ] Feature issue bodies enriched with full plan content
- [ ] Unpushed branches and tags pushed to remote
- [ ] Un-referenced commits amended with issue refs (force-push permitted here only)
- [ ] Unlinked branches linked to issues via `createLinkedBranch`
- [ ] Epics without GitHub issues skipped silently
- [ ] Idempotent — re-running produces no side effects on reconciled epics
- [ ] Per-epic warn-and-continue — one failure doesn't stop the batch
- [ ] Summary report printed at end
