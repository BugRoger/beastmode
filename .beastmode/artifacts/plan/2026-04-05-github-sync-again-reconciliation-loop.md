---
phase: plan
slug: 00ddfb
epic: github-sync-again
feature: reconciliation-loop
wave: 2
---

# reconciliation-loop

**Design:** `.beastmode/artifacts/design/2026-04-05-00ddfb.md`

## User Stories

5. As a project owner, I want a reconciliation pass on each watch loop tick that drains the retry queue, so that stubs get enriched and failed operations get retried without waiting for the next phase transition.
8. As a project owner, I want sync-refs to bootstrap from the epic store when empty, populating entries in a state that triggers full reconciliation, so that existing issues with broken bodies get fixed automatically.

## What to Build

Add a reconciliation subsystem that runs on every watch loop tick, draining the retry queue and bootstrapping sync-refs when needed.

**Reconciliation function:** A new `reconcileGitHub` function that:
1. Loads sync-refs and the epic store
2. Calls `drainPendingOps` (from retry-queue feature) with the current tick number to get ready operations
3. For each ready operation, executes the appropriate GitHub API call (body enrich, title update, label sync, board sync, sub-issue link)
4. On success: calls `resolvePendingOp` to remove the operation
5. On failure: increments retry count and recomputes next-retry tick via backoff
6. Saves updated sync-refs

This function is pure infrastructure — it replays operations that the sync engine originally attempted. The operation types and their execution logic mirror the existing sync paths.

**Sync-refs bootstrap:** When `reconcileGitHub` detects that sync-refs is empty but the epic store has entities, it runs a bootstrap pass:
1. Iterate all epics and their features in the store
2. For each entity, check if a GitHub issue already exists (via `gh issue list` with label filter, or from sync-refs if partially populated)
3. Create a sync-ref entry with `bodyHash: undefined` — the hash mismatch against the current body content triggers body reconciliation on the next sync pass
4. Skip entities that have no GitHub issue number discoverable

The bootstrap is idempotent — if sync-refs already has entries, the bootstrap is a no-op.

**Watch loop integration:** Add a `reconcileGitHub()` call inside the watch loop's `tick()` method, after the epic scan and before scheduling the next tick. The reconciliation runs on every tick regardless of whether new sessions were dispatched. It operates on sync-refs state, not on the dispatch tracker.

**Full reconciliation scope:** When an entity's sync-ref has `bodyHash: undefined` (from bootstrap or from initial stub creation), the reconciliation pass:
- Regenerates the issue body using the current store state and artifacts
- Updates the issue title (for features: ensures `{epic}: {feature}` format)
- Syncs labels (phase/status)
- Updates project board status
- Links sub-issues to parent epic

## Integration Test Scenarios

```gherkin
@github-sync-again
Feature: Watch loop reconciliation drains retry queue each tick

  On each watch loop tick, a reconciliation pass runs that drains the retry
  queue, re-attempting failed GitHub API operations without waiting for a
  phase transition.

  Scenario: Reconciliation pass runs on every watch loop tick
    Given the watch loop is active and ticking
    And there are pending operations in the retry queue
    When a watch loop tick executes
    Then a reconciliation pass begins
    And all operations in the retry queue are considered for retry

  Scenario: Failed operation is retried during reconciliation
    Given an operation failed earlier and was queued for retry
    And the backoff interval has elapsed
    When the reconciliation pass runs
    Then the operation is retried
    And the result (success or failure) is recorded

  Scenario: Successfully retried operations enrich stubs
    Given a feature issue was created as a minimal stub without a body
    And the feature issue body enrichment was queued for retry after an API failure
    When the reconciliation pass retries enrichment and succeeds
    Then the feature issue body is updated with description and user story
    And the issue is no longer a stub

  Scenario: Reconciliation prevents stale stubs from persisting
    Given feature issues were created pre-dispatch as minimal stubs
    And enrichment was queued but failed during the initial phase
    When multiple watch loop ticks pass
    Then reconciliation on each tick retries enrichment
    And issues are not left empty indefinitely
```

```gherkin
@github-sync-again
Feature: Sync-refs bootstrap from epic store when empty

  The sync-refs state tracks which GitHub issues are synchronized. When
  sync-refs is empty, a bootstrap pass reads all epics from the store and
  populates sync-refs entries in a state that triggers full reconciliation,
  bringing broken issue bodies up to the current PRD.

  Scenario: Bootstrap populates sync-refs from epic store on startup
    Given sync-refs is empty
    And the epic store contains three epics with GitHub issue numbers
    When the sync engine initializes
    Then sync-refs is populated with one entry per epic
    And each entry is marked for full reconciliation

  Scenario: Bootstrap entry triggers enrichment for broken issues
    Given sync-refs is bootstrapped with an epic that has an old GitHub issue
    And the issue body contains no PRD content
    When the reconciliation pass runs
    Then the issue body is enriched with the current PRD sections
    And the issue is no longer broken

  Scenario: Bootstrapped entries do not duplicate if sync-refs is already populated
    Given sync-refs already contains three epics
    When the sync engine checks for bootstrap
    Then no duplicate entries are added
    And existing entries are preserved

  Scenario: Bootstrap marks all entries for the same reconciliation pass
    Given sync-refs is bootstrapped with five epics
    When the reconciliation pass executes
    Then all five epics are processed in the same pass
    And the enrichment is consistent across all issues

  Scenario: Bootstrap detects and skips epics without GitHub issue numbers
    Given the epic store contains an epic with no issue_number in its manifest
    When the bootstrap pass runs
    Then the epic is skipped without error
    And only epics with valid issue numbers are added to sync-refs
```

## Acceptance Criteria

- [ ] `reconcileGitHub` function drains the retry queue on each call
- [ ] Ready operations (backoff elapsed) are executed against the GitHub API
- [ ] Successful operations are removed from the queue; failures increment retry count
- [ ] Watch loop's `tick()` calls `reconcileGitHub()` on every tick
- [ ] Empty sync-refs triggers bootstrap from epic store
- [ ] Bootstrap creates entries with `bodyHash: undefined` to trigger body reconciliation
- [ ] Bootstrap is idempotent — no-op when sync-refs is already populated
- [ ] Full reconciliation covers: title, body, labels, board status, sub-issue links
- [ ] Entities without discoverable GitHub issue numbers are skipped during bootstrap
- [ ] Integration tests verify stub enrichment via reconciliation pass
