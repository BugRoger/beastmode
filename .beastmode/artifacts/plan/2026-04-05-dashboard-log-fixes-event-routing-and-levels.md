---
phase: plan
slug: ed09f0
epic: dashboard-log-fixes
feature: event-routing-and-levels
wave: 2
---

# Event Routing and Levels

**Design:** `.beastmode/artifacts/design/2026-04-05-ed09f0.md`

## User Stories

1. As a pipeline operator, I want each log entry to appear only once (hierarchically under its epic), so that I can follow activity without visual noise from duplicates.
2. As a pipeline operator, I want scan-complete heartbeats, watch loop lifecycle, session started, and session completed to be debug level, so that info view shows only actionable events.
3. As a pipeline operator, I want dead-session re-dispatch, epic-blocked, and release-held events to be warn level, so that abnormal conditions stand out.
4. As a pipeline operator, I want the iTerm session ID included in the dispatch log entry (e.g., "dispatching (session: w:12345)"), so that I can correlate dashboard entries with iTerm tabs.

## What to Build

Three interconnected changes in the event handling pipeline:

### Dual-Write Elimination

In App.tsx event handlers, remove `pushSystemEntry()` calls from all epic-scoped events. Only truly global events remain on the CLI root node:
- **Keep on CLI root:** `started` (watch loop), `stopped` (watch loop), `scan-complete` (when no sessions active), errors without epicSlug
- **Remove from CLI root:** `session-started`, `session-completed`, `scan-complete` (when sessions active), `epic-blocked`, `release:held`, `session-dead`, `epic-cancelled`

These events still flow to the FallbackEntryStore for hierarchical tree display — only the duplicate system entry is removed.

### Log Level Reclassification

Add an optional `level` field to the `LogEntry` interface in factory.ts. Update `entryTypeToLevel()` in use-dashboard-tree-state.ts to prefer this field over the type-based mapping when present.

Apply the reclassification table from the PRD:

| Event | Level |
|-------|-------|
| scan-complete | debug |
| started (watch loop) | debug |
| stopped (watch loop) | debug |
| session-started | debug |
| session-completed (success) | debug |
| session-completed (failed) | error (unchanged) |
| session-dead | warn |
| epic-blocked | warn |
| release:held | warn |
| epic-cancelled | info (unchanged) |
| error | error (unchanged) |

For system entries (remaining on CLI root after dual-write elimination), pass the correct level to `pushSystemEntry()`. For tree entries, set the `level` field on the LogEntry returned by `lifecycleToLogEntry()`.

### Session ID in Dispatch Entry

Update `lifecycleToLogEntry("session-started")` to include the sessionId from the payload. Format: `"dispatching (session: ${sessionId})"`. The `SessionStartedEvent` type already includes `sessionId: string`.

## Integration Test Scenarios

```gherkin
@dashboard-log-fixes
Feature: Event routing, deduplication, and level assignment

  Log entries appear exactly once in the tree hierarchy, routed to their
  parent epic. Lifecycle events are classified at the correct severity
  level. Dispatch entries include the iTerm session identifier for
  cross-referencing with terminal tabs.

  # --- US 1: Deduplication / hierarchical routing ---

  Scenario: Each log entry appears exactly once under its epic
    Given the dashboard is running with an active epic "auth-system"
    When a dispatch event is emitted for epic "auth-system"
    Then the entry appears under the "auth-system" epic node
    And the entry does not appear under the CLI root section
    And the entry does not appear under any other epic node

  Scenario: An entry routed to a feature does not also appear at epic level
    Given the dashboard is running with epic "auth-system" and feature "login"
    When an implement event is emitted for feature "login" of epic "auth-system"
    Then the entry appears under feature "login" of epic "auth-system"
    And the entry does not also appear directly under the "auth-system" epic node

  # --- US 3: Debug-level lifecycle events ---

  Scenario Outline: Lifecycle heartbeats and bookends are classified as debug
    Given the watch loop is running
    When a "<event_kind>" event occurs
    Then the log entry is classified at "debug" level

    Examples:
      | event_kind        |
      | scan-complete     |
      | watch-start       |
      | watch-stop        |
      | session-started   |
      | session-completed |

  Scenario: Scan-complete heartbeats are hidden at info verbosity
    Given the dashboard is running at info verbosity
    When a scan-complete heartbeat event is emitted
    Then the scan-complete entry is not visible in the log panel

  Scenario: Session lifecycle bookends are hidden at info verbosity
    Given the dashboard is running at info verbosity
    When a session-started event is emitted
    And a session-completed event is emitted
    Then neither the session-started nor session-completed entry is visible

  # --- US 4: Warn-level abnormal condition events ---

  Scenario Outline: Abnormal conditions are classified as warn
    Given the watch loop is running
    When a "<event_kind>" event occurs
    Then the log entry is classified at "warn" level

    Examples:
      | event_kind          |
      | dead-session        |
      | epic-blocked        |
      | release-held        |

  Scenario: Warn-level events are always visible at info verbosity
    Given the dashboard is running at info verbosity
    When a dead-session re-dispatch event is emitted
    Then the dead-session entry is visible in the log panel

  Scenario: Epic-blocked stands out at default verbosity
    Given the dashboard is running at info verbosity
    When an epic-blocked event is emitted for epic "auth-system"
    Then the epic-blocked entry is visible under "auth-system"

  # --- US 5: iTerm session ID in dispatch entries ---

  Scenario: Dispatch log entry includes the iTerm session identifier
    Given the watch loop is running
    When a phase is dispatched with iTerm session "w:12345"
    Then the dispatch log entry contains "session: w:12345"

  Scenario: Dispatch entry without an iTerm session omits the session field
    Given the watch loop is running
    When a phase is dispatched without an iTerm session
    Then the dispatch log entry does not contain a session identifier

  Scenario Outline: Session ID format matches iTerm window identifier pattern
    Given the watch loop is running
    When a phase is dispatched with iTerm session "<session_id>"
    Then the dispatch log entry contains "session: <session_id>"

    Examples:
      | session_id |
      | w:12345    |
      | w:67890    |
      | w:1        |
```

## Acceptance Criteria

- [ ] Epic-scoped events no longer call `pushSystemEntry()` — no duplicate entries between CLI root and tree
- [ ] Only global events (watch start/stop, idle scan-complete, unscoped errors) appear under CLI root
- [ ] `LogEntry` type has optional `level` field
- [ ] `entryTypeToLevel()` prefers explicit `level` over type-based mapping
- [ ] scan-complete, started, stopped, session-started, session-completed (success) are debug level
- [ ] session-dead, epic-blocked, release:held are warn level
- [ ] session-completed (failed) and error remain error level
- [ ] epic-cancelled remains info level
- [ ] `lifecycleToLogEntry("session-started")` output includes sessionId: `"dispatching (session: ${sessionId})"`
- [ ] New unit tests for `lifecycleToLogEntry` sessionId inclusion
- [ ] Integration test for `buildTreeState` verifying no duplicate entries
