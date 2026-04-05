---
phase: plan
slug: 00ddfb
epic: github-sync-again
feature: retry-queue
wave: 1
---

# retry-queue

**Design:** `.beastmode/artifacts/design/2026-04-05-00ddfb.md`

## User Stories

4. As a project owner, I want failed GitHub API operations to be retried automatically with exponential backoff (5 retries), so that eventual consistency delays don't result in permanently broken issues.

## What to Build

Add a retry queue system to the sync-refs infrastructure. The queue tracks failed GitHub API operations and schedules them for automatic retry with exponential backoff.

**Data model extension:** Extend the `SyncRef` interface with an optional `pendingOps` array. Each pending operation has: operation type (string enum: `"bodyEnrich"`, `"titleUpdate"`, `"labelSync"`, `"boardSync"`, `"subIssueLink"`), retry count (number), next-retry tick number (number), and a context payload (operation-specific data needed to replay the operation). The sync-refs I/O module reads and writes this extended format transparently.

**Backoff calculation:** Exponential backoff with tick-based delays: retry N waits `2^N` ticks (1, 2, 4, 8, 16). After 5 failed retries, the operation is marked as `"failed"` status and logged as a permanent failure warning. A pure function computes the next retry tick from the current tick number and retry count.

**Queue operations:** Three core functions:
1. `enqueuePendingOp` — adds a new operation to an entity's pending ops list
2. `drainPendingOps` — given the current tick number, returns all operations whose next-retry tick has arrived, grouped by entity
3. `resolvePendingOp` — removes a completed operation (success or permanent failure) from the queue

These are pure functions operating on the `SyncRefs` data structure, consistent with the existing immutable pattern in sync-refs.

**Integration point:** The sync engine's error handling paths (issue creation failure, body update failure, label sync failure) should call `enqueuePendingOp` instead of silently swallowing errors. This is the seam where retry-queue connects to the existing sync flow — but the actual reconciliation loop that drains the queue is a separate feature.

## Integration Test Scenarios

```gherkin
@github-sync-again
Feature: Failed GitHub API operations retry with exponential backoff

  When a GitHub API operation fails (network error, rate limit, transient error),
  the operation is queued for retry with exponential backoff. Up to 5 retries
  occur before the operation is considered permanently failed.

  Scenario: Failed API operation is queued for retry
    Given a GitHub API operation fails with a network error
    When the operation completes
    Then the operation is added to the retry queue
    And the failure is logged

  Scenario: Retry queue attempts up to 5 retries with exponential backoff
    Given an operation in the retry queue with attempt count 0
    When the retry is attempted after the first backoff interval
    Then the operation is retried
    And attempt count is incremented to 1

  Scenario: Exponential backoff uses increasing delays between retries
    Given an operation queued for retry with attempt 0
    When the first retry executes
    Then the delay before retry 1 is approximately 2^1 seconds
    And a subsequent retry at attempt 2 has delay approximately 2^2 seconds

  Scenario: Operation succeeds on retry
    Given an operation failed on first attempt but succeeds on retry 2
    When the retry completes successfully
    Then the operation is removed from the retry queue
    And success is logged

  Scenario: Operation marked permanently failed after 5 retries
    Given an operation has been retried 5 times unsuccessfully
    When the next tick considers the queue
    Then the operation is removed from the retry queue
    And marked as permanently failed
    And an alert is logged

  Scenario: Retry queue preserves operation context across attempts
    Given an operation to create a GitHub issue is queued for retry
    And the operation context includes the issue title and body
    When the operation is retried
    Then the same title and body are used for the next attempt
```

## Acceptance Criteria

- [ ] `SyncRef` interface extended with optional `pendingOps` array
- [ ] Each pending op stores: operation type, retry count, next-retry tick, and context payload
- [ ] Exponential backoff computes correctly: 1, 2, 4, 8, 16 tick delays
- [ ] Operations are marked `failed` and logged after 5 unsuccessful retries
- [ ] `enqueuePendingOp`, `drainPendingOps`, and `resolvePendingOp` are pure functions
- [ ] Existing sync-refs I/O reads/writes the extended format without breaking existing refs
- [ ] Sync engine error paths enqueue failed operations instead of silently dropping them
- [ ] Unit tests cover backoff calculation, queue operations, and the 5-retry limit
