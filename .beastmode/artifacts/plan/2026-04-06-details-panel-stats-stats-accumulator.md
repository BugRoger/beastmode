---
phase: plan
slug: 7c2042
epic: details-panel-stats
feature: stats-accumulator
wave: 1
---

# Stats Accumulator

**Design:** `.beastmode/artifacts/design/2026-04-06-7c2042.md`

## User Stories

1. As a user viewing the dashboard with "(all)" selected, I want to see session stats (total count, active count, success rate, uptime, cumulative session time), so that I understand pipeline throughput at a glance.

5. As a developer, I want session stats accumulated in a dedicated module (`session-stats.ts`) that subscribes to watch loop events, so that stats logic is testable and decoupled from React rendering.

## What to Build

A pure logic module that subscribes to WatchLoop EventEmitter events and maintains running session metrics. The module is decoupled from React and the dashboard rendering layer.

**Stats accumulator class/object:**
- Accepts a WatchLoop EventEmitter (or typed event source) and subscribes to `session-started`, `session-completed`, and `scan-complete` events
- Maintains counters: total completed sessions, active (in-flight) sessions, successful sessions, failed sessions, re-dispatches (sessions that started for the same epic+feature+phase combo more than once)
- Tracks per-phase duration arrays for the four pipeline phases (plan, implement, validate, release) and computes running averages
- Tracks cumulative session time (sum of all completed session durations)
- Records start timestamp for uptime calculation; uptime is recomputed on `scan-complete` events (not a timer)
- Exposes an `isEmpty` flag that is true until the first `session-completed` event fires
- Exposes a `getStats()` method (or equivalent) returning a typed snapshot of all accumulated metrics

**Re-dispatch detection:**
- A re-dispatch is identified when a `session-started` event fires for an epic+feature+phase combination that has already had a prior `session-completed` event. The accumulator maintains a set of completed session keys to detect this.

**Type definitions:**
- A `SessionStats` interface for the snapshot returned by `getStats()` — includes total, active, successes, failures, reDispatches, successRate (computed), uptimeMs, cumulativeMs, and a `phaseDurations` record mapping phase name to average duration (or null for unseen phases)

**Unit tests:**
- Counter accumulation from mock events (started, completed with success/failure)
- Average duration calculation across multiple completions of the same phase
- Empty state detection (isEmpty true before first completion, false after)
- Re-dispatch counting logic
- Uptime computation from scan-complete events
- Initial state (all zeros, isEmpty true)

## Integration Test Scenarios

```gherkin
@details-panel-stats
Feature: Session stats accumulation from watch loop events

  A dedicated stats accumulator subscribes to watch loop events and
  maintains running counters for session metrics. The accumulator is
  decoupled from rendering and produces computed stats on demand.

  Scenario: Total session count increments when a session completes
    Given the stats accumulator is initialized
    And no sessions have completed
    When a session completes successfully
    Then the total session count is 1
    When a second session completes successfully
    Then the total session count is 2

  Scenario: Active session count reflects currently running sessions
    Given the stats accumulator is initialized
    When a session starts
    Then the active session count is 1
    When a second session starts
    Then the active session count is 2
    When the first session completes
    Then the active session count is 1

  Scenario: Success rate reflects completed session outcomes
    Given the stats accumulator is initialized
    When 3 sessions complete successfully
    And 1 session completes with failure
    Then the success rate is 75 percent

  Scenario: Cumulative session time sums all completed session durations
    Given the stats accumulator is initialized
    When a session completes with a duration of 120 seconds
    And a second session completes with a duration of 60 seconds
    Then the cumulative session time is 180 seconds

  Scenario: Uptime reflects elapsed time since accumulator started
    Given the stats accumulator is initialized at a known start time
    When time advances by 300 seconds
    And a scan-complete event fires
    Then the reported uptime is approximately 300 seconds

  Scenario: Accumulator reports empty state before any session completes
    Given the stats accumulator is initialized
    And no sessions have completed
    Then the accumulator reports an empty state

  Scenario: Accumulator exits empty state after first session completes
    Given the stats accumulator is initialized
    And no sessions have completed
    When a session completes successfully
    Then the accumulator no longer reports an empty state

  Scenario: Phase duration averages are computed per phase
    Given the stats accumulator is initialized
    When a session completes the "plan" phase in 30 seconds
    And a second session completes the "plan" phase in 50 seconds
    Then the average duration for the "plan" phase is 40 seconds

  Scenario Outline: All four pipeline phases track durations independently
    Given the stats accumulator is initialized
    When a session completes the "<phase>" phase in 60 seconds
    Then the average duration for the "<phase>" phase is 60 seconds
    And the other phases show no recorded duration

    Examples:
      | phase     |
      | plan      |
      | implement |
      | validate  |
      | release   |

  Scenario: Unseen phases display no duration data
    Given the stats accumulator is initialized
    When a session completes the "plan" phase in 45 seconds
    Then the "implement" phase has no recorded duration
    And the "validate" phase has no recorded duration
    And the "release" phase has no recorded duration

  Scenario: Retry count increments on re-dispatch events
    Given the stats accumulator is initialized
    When a session is re-dispatched
    Then the total re-dispatch count is 1
    When a session is re-dispatched again
    Then the total re-dispatch count is 2

  Scenario: Failure count increments on terminal failures
    Given the stats accumulator is initialized
    When a session completes with failure
    Then the total failure count is 1

  Scenario: Stats reset on accumulator initialization
    Given the stats accumulator is initialized
    Then the total session count is 0
    And the active session count is 0
    And the total re-dispatch count is 0
    And the total failure count is 0
```

## Acceptance Criteria

- [ ] `session-stats.ts` module exists in the dashboard directory, exports accumulator class and `SessionStats` type
- [ ] Accumulator subscribes to `session-started`, `session-completed`, and `scan-complete` events from a typed event source
- [ ] Total, active, success, failure, and re-dispatch counters accumulate correctly
- [ ] Per-phase average durations computed for plan, implement, validate, release
- [ ] `isEmpty` returns true before first completion, false after
- [ ] Uptime computed from start timestamp on `scan-complete` events
- [ ] Unit tests pass for all counter, average, empty-state, and re-dispatch scenarios
- [ ] No React or dashboard rendering imports in the module
