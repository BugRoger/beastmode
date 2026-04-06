---
phase: plan
slug: "179441"
epic: dashboard-log-fixes
feature: status-fallback-fix
wave: 1
---

# Status Fallback Fix

**Design:** .beastmode/artifacts/design/2026-04-06-179441.md

## User Stories

6. As a user watching the dashboard, I want active sessions that haven't synced to the store yet to show their current phase as the status badge instead of "(unknown)" so that the tree is always informative.

## What to Build

When `buildTreeState` encounters a session whose epic slug doesn't exist in the enriched epics skeleton, it creates a dynamic epic node on the fly. Currently these dynamic nodes get a hardcoded `"unknown"` status. Same for dynamic feature nodes created for sessions with a feature slug not in the skeleton.

Change the dynamic epic node creation to use `session.phase` as the status instead of `"unknown"`. The session's phase (design, plan, implement, validate, release) is always available and is more informative than "unknown" for an active session.

Change the dynamic feature node creation to use `"in-progress"` as the status instead of `"unknown"`. A session's existence implies active work, so "in-progress" is the correct semantic status for a feature that has a running session but hasn't synced to the store yet.

Both changes are in the `buildTreeState` function. No interface changes, no new parameters, no changes to the enriched-epics skeleton seeding path.

## Integration Test Scenarios

```gherkin
@dashboard-log-fixes
Feature: Active sessions show current phase instead of unknown

  Sessions that have been dispatched but have not yet synced their
  status to the store display their current phase as the status badge
  instead of "(unknown)". The fallback resolves as soon as the store
  sync completes.

  Scenario: Newly dispatched session shows its phase as status
    Given the dashboard is running with an active epic
    When a session is dispatched for the "plan" phase
    And the session has not yet synced status to the store
    Then the session's status badge displays "plan"
    And the status badge does not display "(unknown)"

  Scenario: Status badge updates when store sync completes
    Given a session was dispatched for the "implement" phase
    And the session's status badge displays "implement" as the fallback
    When the session syncs its status to the store as "running"
    Then the session's status badge updates to "running"

  Scenario: Multiple unsynced sessions each show their respective phase
    Given the dashboard is running with two active epics
    When epic A dispatches a session for the "design" phase
    And epic B dispatches a session for the "validate" phase
    And neither session has synced to the store
    Then epic A's session badge displays "design"
    And epic B's session badge displays "validate"

  Scenario: Completed sessions that synced never show fallback
    Given a session completed the "plan" phase
    And the session synced its status to the store as "completed"
    Then the session's status badge displays "completed"
    And the fallback logic is not applied
```

## Acceptance Criteria

- [ ] Dynamic epic nodes in `buildTreeState` use `session.phase` as status instead of `"unknown"`
- [ ] Dynamic feature nodes in `buildTreeState` use `"in-progress"` as status instead of `"unknown"`
- [ ] Epic nodes seeded from enriched epics skeleton retain their original status (unchanged)
- [ ] Feature nodes seeded from enriched epics skeleton retain their original status (unchanged)
- [ ] No `"unknown"` status badge appears for any node with an active session
